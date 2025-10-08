
import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getMint,
  getAccount,
} from '@solana/spl-token';
import { siteConfig } from '@/config/site';
import { adminDB } from '@/lib/firebaseAdmin'; // Correct Admin SDK import
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
  const firestore = adminDB(); // Initialize Admin Firestore
  console.log('--- Received POST /api/merchant/redeem-order ---');

  try {
    const { order: clientOrder } = await req.json();
    const { userId, merchantId, orderId } = clientOrder;

    if (!userId || !merchantId || !orderId) {
      return NextResponse.json({ error: 'Missing critical order data (userId, merchantId, or orderId)' }, { status: 400 });
    }

    // --- Phase 1: Data Validation (outside transaction) ---
    const userDocRef = firestore.collection('users').doc(userId);
    const merchantDocRef = firestore.collection('merchants').doc(merchantId);

    const userSnap = await userDocRef.get();
    const merchantSnap = await merchantDocRef.get();

    if (!userSnap.exists) throw new Error('User not found');
    if (!merchantSnap.exists) throw new Error('Merchant not found');

    const userData = userSnap.data() as User;
    const merchantData = merchantSnap.data() as Merchant;

    const pendingOrders = merchantData.pendingOrders || [];
    const orderIndex = pendingOrders.findIndex(o => o.orderId === orderId);

    if (orderIndex === -1) throw new Error('Order not found in merchant pending orders.');
    
    const order = pendingOrders[orderIndex];

    if (order.status !== 'ready_to_redeem') throw new Error(`Order not ready for redemption. Status is: ${order.status}`);
    if (!order.price || order.price <= 0) throw new Error('Invalid order price. Price must be greater than zero.');
    if (!userData.seedPhrase) throw new Error('User seed phrase not found. Cannot authorize transfer.');
    if (!merchantData.walletAddress) throw new Error('Merchant wallet address not found. Cannot receive funds.');

    // --- Phase 2: Solana Blockchain Transfer ---
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
    tx.feePayer = userKeypair.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(userKeypair);

    const txSignature = await connection.sendRawTransaction(tx.serialize());
    
    // **REPLACEMENT LOGIC**: Manually confirm the transaction instead of using sendAndConfirmTransaction
    await connection.confirmTransaction({
        signature: txSignature,
        blockhash: tx.recentBlockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
    }, 'confirmed');

    console.log('Redemption Transfer Signature:', txSignature);

    // --- Phase 3: Firestore Atomic Updates (inside transaction) ---
    await firestore.runTransaction(async (transaction) => {
        // Re-fetch docs inside transaction for consistency
        const userDoc = await transaction.get(userDocRef);
        const merchantDoc = await transaction.get(merchantDocRef);
        const freshUserData = userDoc.data() as User;
        const freshMerchantData = merchantDoc.data() as Merchant;

        const completedOrder: CartItem = {
            ...order,
            status: 'completed',
            redeemedAt: Timestamp.now(),
            transactionSignature: txSignature,
        };

        // 1. Update user's walletBalance and cart status
        const updatedUserCart = (freshUserData.cart ?? []).map((cartItem: CartItem) =>
            cartItem.orderId === orderId ? completedOrder : cartItem
        );
        const newBalance = (freshUserData.walletBalance || 0) - order.price;
        transaction.update(userDocRef, { cart: updatedUserCart, walletBalance: newBalance > 0 ? newBalance : 0 });

        // 2. Remove from merchant's pending orders and add to recent transactions
        const updatedPendingOrders = (freshMerchantData.pendingOrders || []).filter((o: CartItem) => o.orderId !== orderId);
        transaction.update(merchantDocRef, {
            pendingOrders: updatedPendingOrders,
            recentTransactions: FieldValue.arrayUnion(completedOrder),
            walletBalance: (freshMerchantData.walletBalance || 0) + order.price,
        });
    });

    return NextResponse.json({ signature: txSignature });

  } catch (error: any) {
    console.error('Error in redeem-order API:', error);
    return NextResponse.json(
      { error: 'Failed to redeem order.', details: String(error?.message || 'An unknown error occurred.') },
      { status: 500 }
    );
  }
}
