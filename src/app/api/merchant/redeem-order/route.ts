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
import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, arrayUnion } from 'firebase/firestore';
import type { User, Merchant, CartItem, MerchantItem } from '@/types';
import * as bip39 from 'bip39';

export const runtime = 'nodejs';

// Helper function to find and update inventory
const updateInventory = (listings: MerchantItem[], itemId: string, quantityChange: number): MerchantItem[] => {
  const listingIndex = listings.findIndex(item => item.id === itemId);
  if (listingIndex > -1) {
    const updatedListings = [...listings];
    const updatedItem = { ...updatedListings[listingIndex] };
    updatedItem.quantity = (updatedItem.quantity ?? 0) + quantityChange;
    updatedListings[listingIndex] = updatedItem;
    return updatedListings;
  }
  return listings;
};

// Derive a keypair from a mnemonic for signing transactions.
function keypairFromMnemonic(mnemonic: string): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  return Keypair.fromSeed(seed.slice(0, 32));
}

// Choose RPC URL (defaults to devnet).
function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}

// Ensure all CartItem required fields are present (fallbacks prevent string|undefined errors)
function normalizeCartItemBase(order: CartItem): CartItem {
  return {
    orderId: order.orderId ?? '',
    title: order.title ?? '',
    itemId: order.itemId ?? '',
    listingId: order.listingId ?? '',
    price: order.price ?? 0,
    quantity: order.quantity ?? 0,
    merchantId: order.merchantId ?? '',
    merchantName: order.merchantName ?? '',
    redeemCode: order.redeemCode ?? '',
    userId: order.userId ?? '',
    userName: order.userName ?? '',
    category: order.category ?? '',
    // The following fields will be set per status variant below:
    status: order.status ?? 'pending',
    redeemedAt: order.redeemedAt,
    transactionSignature: order.transactionSignature,
    error: order.error,
  };
}

export async function POST(req: NextRequest) {
  console.log('--- Received POST /api/merchant/redeem-order ---');

  try {
    const body: { order?: CartItem } = await req.json();
    console.log('Received request body:', body);

    if (!body || !body.order) {
      return NextResponse.json({ error: 'Order data is missing in the request body' }, { status: 400 });
    }

    // From here on, `order` is non-null
    const order = body.order;

    if (!order.userId || !order.merchantId) {
      return NextResponse.json({ error: 'Missing critical order data (userId or merchantId)' }, { status: 400 });
    }

    // Fetch user and merchant documents from Firestore
    const userDocRef = doc(db, 'users', order.userId);
    const merchantDocRef = doc(db, 'merchants', order.merchantId);

    const [userSnap, merchantSnap] = await Promise.all([getDoc(userDocRef), getDoc(merchantDocRef)]);

    if (!userSnap.exists()) throw new Error('User not found');
    if (!merchantSnap.exists()) throw new Error('Merchant not found');

    const userData = userSnap.data() as User;
    const merchantData = merchantSnap.data() as Merchant;

    // Validate necessary data for the transaction
    if (!userData.seedPhrase) throw new Error('User seed phrase not found. Cannot authorize transfer.');
    if (!merchantData.walletAddress) throw new Error('Merchant wallet address not found. Cannot receive funds.');
    if (!order.price || order.price <= 0) throw new Error('Invalid order price. Price must be greater than zero.');

    // --- Start Solana Transaction ---
    const connection = new Connection(getRpcUrl(), 'confirmed');
    const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);

    const userKeypair = keypairFromMnemonic(userData.seedPhrase);
    const merchantPublicKey = new PublicKey(merchantData.walletAddress);

    const mintInfo = await getMint(connection, tokenMintPublicKey);
    const decimals = mintInfo.decimals;

    // Compute raw token amount as BigInt (avoid BigInt literals for older TS targets)
    const rawAmount = BigInt(Math.round(order.price * Math.pow(10, decimals)));

    // VERIFY USER SOL BALANCE FOR TRANSACTION FEES
    const userSolBalance = await connection.getBalance(userKeypair.publicKey);
    if (userSolBalance < 5000) {
      // ~0.000005 SOL; adjust if your txs need more
      throw new Error('Insufficient SOL balance for transaction fees. Please ensure the user wallet has at least 0.000005 SOL.');
    }

    // VERIFY USER TOKEN BALANCE BEFORE ATTEMPTING TRANSACTION
    const fromAta = await getOrCreateAssociatedTokenAccount(
      connection,
      userKeypair,
      tokenMintPublicKey,
      userKeypair.publicKey
    );
    const fromAtaInfo = await getAccount(connection, fromAta.address);
    if (fromAtaInfo.amount < rawAmount) {
      throw new Error(
        `Insufficient funds. User has ${Number(fromAtaInfo.amount) / Math.pow(10, decimals)}, but requires ${order.price}.`
      );
    }

    // Get or create the merchant's token account, with the USER paying the fee if creation is needed
    const toAta = await getOrCreateAssociatedTokenAccount(connection, userKeypair, tokenMintPublicKey, merchantPublicKey);

    const ix = createTransferCheckedInstruction(
      fromAta.address,
      tokenMintPublicKey,
      toAta.address,
      userKeypair.publicKey, // User is the signer
      rawAmount,
      decimals
    );

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [userKeypair]);
    console.log('Redemption Transfer Signature:', signature);

    // --- Update Firestore Documents on Success ---
    await runTransaction(db, async (transaction) => {
      const freshUserSnap = await transaction.get(userDocRef);
      const freshMerchantSnap = await transaction.get(merchantDocRef);

      if (!freshUserSnap.exists() || !freshMerchantSnap.exists()) {
        throw new Error('User or Merchant document vanished during transaction');
      }

      const freshUserData = freshUserSnap.data() as User;
      const freshMerchantData = freshMerchantSnap.data() as Merchant;

      const base = normalizeCartItemBase(order);
      const completedOrder: CartItem = {
        ...base,
        status: 'completed',
        redeemedAt: new Date(),
        transactionSignature: signature,
      };

      const updatedUserCart = (freshUserData.cart ?? []).map((cartItem: CartItem) =>
        cartItem.orderId === base.orderId ? completedOrder : cartItem
      );

      const updatedPendingOrders = (freshMerchantData.pendingOrders ?? []).filter(
        (o: CartItem) => o.orderId !== base.orderId
      );

      // Use arrayUnion to safely add the completed order to recent transactions
      const updatedTransactions = arrayUnion(completedOrder);

      const newMerchantBalance = (freshMerchantData.walletBalance ?? 0) + (base.price ?? 0);
      const newUserBalance = (freshUserData.walletBalance ?? 0) - (base.price ?? 0);

      transaction.update(userDocRef, { cart: updatedUserCart, walletBalance: newUserBalance });
      transaction.update(merchantDocRef, {
        pendingOrders: updatedPendingOrders,
        recentTransactions: updatedTransactions,
        walletBalance: newMerchantBalance,
      });
    });

    return NextResponse.json({ signature });
  } catch (error: any) {
    // Attempt to mark the order as failed in Firestore if we have enough info
    try {
      const body = await req.json().catch(() => null) as { order?: CartItem } | null;
      const order = body?.order;
      if (order?.userId && order?.merchantId) {
        await runTransaction(db, async (transaction) => {
          const merchantDocRef = doc(db, 'merchants', order.merchantId);
          const userDocRef = doc(db, 'users', order.userId);

          const [merchantSnap, userSnap] = await Promise.all([transaction.get(merchantDocRef), transaction.get(userDocRef)]);
          if (!merchantSnap.exists() || !userSnap.exists()) return;

          const merchantData = merchantSnap.data() as Merchant;
          const userData = userSnap.data() as User;

          const base = normalizeCartItemBase(order);
          const failedOrderInCart: CartItem = {
            ...base,
            status: 'failed',
            error: String(error?.message ?? 'Unknown error'),
          };
          const failedOrderForMerchant: CartItem = {
            ...base,
            status: 'failed',
            error: String(error?.message ?? 'Unknown error'),
            redeemedAt: new Date(),
          };

          const updatedPendingOrders = (merchantData.pendingOrders ?? []).filter(
            (o: CartItem) => o.orderId !== base.orderId
          );

          const updatedUserCart = (userData.cart ?? []).map((item: CartItem) =>
            item.orderId === base.orderId ? failedOrderInCart : item
          );

          // Return stock to inventory
          const updatedListings = updateInventory(
            merchantData.listings ?? [],
            base.listingId,
            base.quantity
          );

          transaction.update(merchantDocRef, {
            pendingOrders: updatedPendingOrders,
            recentTransactions: arrayUnion(failedOrderForMerchant),
            listings: updatedListings,
          });
          transaction.update(userDocRef, { cart: updatedUserCart });

          console.log(`Firestore updated for failed order ${base.orderId}`);
        });
      }
    } catch (dbError) {
      console.error('CRITICAL: Failed to update Firestore after redemption error:', dbError);
      console.error('Original redemption error was:', error);
    }

    console.error('Error in redeem-order API:', error);
    return NextResponse.json(
      { error: 'Failed to redeem order.', details: String(error?.message || 'An unknown error occurred.') },
      { status: 500 }
    );
  }
}
