import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';
import { adminDB } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { User, Merchant, CartItem } from '@/types';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

export const runtime = 'nodejs';

// NOTE: We do NOT import @solana/web3.js or @solana/spl-token at top-level.
// They are imported dynamically inside the handler AFTER we set global Buffer/WebSocket.

function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
}

export async function POST(req: NextRequest) {
  // 1) Ensure Node Buffer + WebSocket are present globally BEFORE importing Solana libs.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Buffer } = require('buffer');
    (globalThis as any).Buffer = Buffer;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WebSocket = require('ws');
    (globalThis as any).WebSocket = WebSocket;
  } catch (err) {
    console.warn('Warning: could not set global Buffer/WebSocket. Ensure runtime is Node and ws & buffer are installed.', err);
  }

  // 2) dynamic import of Solana libs so they pick up the globals we just set
  const solana = await import('@solana/web3.js');
  const splToken = await import('@solana/spl-token');

  const {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
    clusterApiUrl,
  } = solana;
  const {
    getOrCreateAssociatedTokenAccount,
    createTransferCheckedInstruction,
    getMint,
    getAccount,
  } = splToken;

  const firestore = adminDB();
  console.log('--- Received POST /api/merchant/redeem-order ---');

  // helper: derive a 32-byte seed for Keypair.fromSeed using bip39 + ed25519-hd-key
  function deriveSeedFromMnemonic(mnemonic: string, path = "m/44'/501'/0'/0'") {
    const seedBuffer = bip39.mnemonicToSeedSync(mnemonic); // Buffer
    const derived = derivePath(path, seedBuffer.toString('hex'));
    // derived.key is a Buffer (32 bytes) suitable for Keypair.fromSeed
    return derived.key;
  }

  try {
    // platform mnemonic (server-controlled) -> platformKeypair
    if (!process.env.LOCALCOIN_MNEMONIC) {
      throw new Error('CRITICAL: The LOCALCOIN_MNEMONIC environment variable is not configured.');
    }
    const platformSeed = deriveSeedFromMnemonic(process.env.LOCALCOIN_MNEMONIC);
    const platformKeypair = Keypair.fromSeed(platformSeed);

    const { order: clientOrder } = await req.json();
    const { userId, merchantId, orderId } = clientOrder || {};

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

    // Derive user keypair from user's seedPhrase (server-side secret)
    const userSeed = deriveSeedFromMnemonic(userData.seedPhrase);
    const userKeypair = Keypair.fromSeed(userSeed);

    const merchantPublicKey = new PublicKey(merchantData.walletAddress);

    const mintInfo = await getMint(connection, tokenMintPublicKey);
    const decimals = mintInfo.decimals;
    const rawAmount = BigInt(Math.round(order.price * Math.pow(10, decimals)));

    // Get or create associated token accounts; platform pays for account creation
    const fromAta = await getOrCreateAssociatedTokenAccount(
      connection,
      platformKeypair, // payer for account creation
      tokenMintPublicKey,
      userKeypair.publicKey
    );

    const fromAtaInfo = await getAccount(connection, fromAta.address);

    // normalize amount to BigInt for comparison (fromAtaInfo.amount could be bigint or string)
    const fromAmountBigInt =
      typeof fromAtaInfo.amount === 'bigint' ? fromAtaInfo.amount : BigInt(fromAtaInfo.amount.toString());

    if (fromAmountBigInt < rawAmount) {
      throw new Error(
        `Insufficient funds. User has ${Number(fromAmountBigInt) / Math.pow(10, decimals)}, but requires ${order.price}.`
      );
    }

    const toAta = await getOrCreateAssociatedTokenAccount(
      connection,
      platformKeypair, // payer for account creation
      tokenMintPublicKey,
      merchantPublicKey
    );

    const ix = createTransferCheckedInstruction(
      fromAta.address,
      tokenMintPublicKey,
      toAta.address,
      userKeypair.publicKey,
      rawAmount,
      decimals
    );

    const tx = new Transaction().add(ix);

    // The user's keypair signs to authorize transfer from their token account
    const txSignature = await sendAndConfirmTransaction(connection, tx, [userKeypair]);
    console.log('Redemption Transfer Signature:', txSignature);

    // --- Phase 3: Firestore Atomic Updates (inside transaction) ---
    await firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      const merchantDoc = await transaction.get(merchantDocRef);
      const freshUserData = userDoc.data() as User;
      const freshMerchantData = merchantDoc.data() as Merchant;

      const completedOrder: CartItem = {
        ...order,
        status: 'completed',
        redeemedAt: new Date(),
        transactionSignature: txSignature,
      };

      // update user cart & balance
      const updatedUserCart = (freshUserData.cart ?? []).map((cartItem: CartItem) =>
        cartItem.orderId === orderId ? completedOrder : cartItem
      );
      const newBalance = (freshUserData.walletBalance || 0) - order.price;
      transaction.update(userDocRef, { cart: updatedUserCart, walletBalance: newBalance > 0 ? newBalance : 0 });

      // update merchant pendingOrders / recentTransactions / walletBalance
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
    return NextResponse.json({ error: 'Failed to redeem order.', details: String(error?.message || 'An unknown error occurred.') }, { status: 500 });
  }
}
