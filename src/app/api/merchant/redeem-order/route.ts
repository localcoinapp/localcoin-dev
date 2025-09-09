
'use server';

import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getMint,
  getAccount,
} from '@solana/spl-token';
import { siteConfig } from '@/config/site';
import { firestore } from '@/lib/firebase-admin'; // Use Admin SDK
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { User, Merchant, CartItem } from '@/types';
import * as bip39 from 'bip39';

export const runtime = 'nodejs';

// Derive a keypair from a mnemonic for signing transactions.
function keypairFromMnemonic(mnemonic: string): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  return Keypair.fromSeed(seed.slice(0, 32));
}

// Choose RPC URL (defaults to devnet).
function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}

export async function POST(req: NextRequest) {
  console.log('--- Received POST /api/merchant/redeem-order ---');

  try {
    const { userId, merchantId, orderId } = await req.json();

    if (!userId || !merchantId || !orderId) {
      return NextResponse.json({ error: 'Missing critical order data (userId, merchantId, or orderId)' }, { status: 400 });
    }

    // --- Core Transaction Logic using Admin SDK ---
    const signature = await firestore.runTransaction(async (transaction) => {
      const userDocRef = firestore.collection('users').doc(userId);
      const merchantDocRef = firestore.collection('merchants').doc(merchantId);

      const [userSnap, merchantSnap] = await Promise.all([
        transaction.get(userDocRef),
        transaction.get(merchantDocRef),
      ]);

      if (!userSnap.exists) throw new Error('User not found');
      if (!merchantSnap.exists) throw new Error('Merchant not found');

      const userData = userSnap.data() as User;
      const merchantData = merchantSnap.data() as Merchant;

      // Find the specific order in the user's cart this time
      const userCart = userData.cart || [];
      const orderIndex = userCart.findIndex(o => o.orderId === orderId);

      if (orderIndex === -1) throw new Error('Order not found in user cart.');
      
      const order = userCart[orderIndex];

      if (order.status !== 'ready_to_redeem') throw new Error(`Order not ready for redemption. Status is: ${order.status}`);
      if (!order.price || order.price <= 0) throw new Error('Invalid order price. Price must be greater than zero.');

      // --- Solana Blockchain Transfer ---
      if (!userData.seedPhrase) throw new Error('User seed phrase not found. Cannot authorize transfer.');
      if (!merchantData.walletAddress) throw new Error('Merchant wallet address not found. Cannot receive funds.');

      const connection = new Connection(getRpcUrl(), 'confirmed');
      const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);
      const userKeypair = keypairFromMnemonic(userData.seedPhrase);
      const merchantPublicKey = new PublicKey(merchantData.walletAddress);

      const mintInfo = await getMint(connection, tokenMintPublicKey);
      const decimals = mintInfo.decimals;
      const rawAmount = BigInt(Math.round(order.price * Math.pow(10, decimals)));

      const userSolBalance = await connection.getBalance(userKeypair.publicKey);
      if (userSolBalance < 5000) throw new Error('Insufficient SOL balance for transaction fees.');

      const fromAta = await getOrCreateAssociatedTokenAccount(connection, userKeypair, tokenMintPublicKey, userKeypair.publicKey);
      const fromAtaInfo = await getAccount(connection, fromAta.address);
      if (fromAtaInfo.amount < rawAmount) {
        throw new Error(`Insufficient funds. User has ${Number(fromAtaInfo.amount) / Math.pow(10, decimals)}, but requires ${order.price}.`);
      }

      const toAta = await getOrCreateAssociatedTokenAccount(connection, userKeypair, tokenMintPublicKey, merchantPublicKey);
      const ix = createTransferCheckedInstruction(fromAta.address, tokenMintPublicKey, toAta.address, userKeypair.publicKey, rawAmount, decimals);

      const tx = new Transaction().add(ix);
      const txSignature = await sendAndConfirmTransaction(connection, tx, [userKeypair]);
      console.log('Redemption Transfer Signature:', txSignature);
      // --- End Solana Transfer ---

      // --- Firestore Atomic Updates ---
      const completedOrder: CartItem = {
        ...order,
        status: 'completed',
        redeemedAt: Timestamp.now(),
        transactionSignature: txSignature,
      };

      // 1. Update user's cart
      const updatedUserCart = (userData.cart ?? []).map((cartItem: CartItem) =>
        cartItem.orderId === orderId ? completedOrder : cartItem
      );
      transaction.update(userDocRef, { cart: updatedUserCart, walletBalance: (userData.walletBalance || 0) - order.price });

      // 2. Update merchant's records
      const updatedPendingOrders = (merchantData.pendingOrders ?? []).filter(o => o.orderId !== orderId);
      transaction.update(merchantDocRef, {
        pendingOrders: updatedPendingOrders,
        recentTransactions: FieldValue.arrayUnion(completedOrder),
        walletBalance: (merchantData.walletBalance || 0) + order.price,
      });

      return txSignature; // Return signature on success
    });

    return NextResponse.json({ signature });

  } catch (error: any) {
    console.error('Error in redeem-order API:', error);
    return NextResponse.json(
      { error: 'Failed to redeem order.', details: String(error?.message || 'An unknown error occurred.') },
      { status: 500 }
    );
  }
}
