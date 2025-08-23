
'use client';

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
import type { User, Merchant, CartItem, OrderStatus, MerchantItem } from '@/types';
import * as bip39 from 'bip39';

// Helper function to find and update inventory
const updateInventory = (listings: MerchantItem[], itemId: string, quantityChange: number): MerchantItem[] => {
    const listingIndex = listings.findIndex(item => item.id === itemId);

    if (listingIndex > -1) {
        const updatedListings = [...listings];
        const updatedItem = { ...updatedListings[listingIndex] };
        updatedItem.quantity = (updatedItem.quantity || 0) + quantityChange;
        updatedListings[listingIndex] = updatedItem;
        return updatedListings;
    }
    return listings;
};

// This function derives a keypair from a mnemonic, which is necessary for signing transactions.
function keypairFromMnemonic(mnemonic: string): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  // Using the first 32 bytes of the seed is a common and simple derivation method.
  return Keypair.fromSeed(seed.slice(0, 32));
}

// Function to determine the RPC URL for Solana, defaulting to devnet.
function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}

export async function POST(req: NextRequest) {
  console.log('--- Received POST /api/merchant/redeem-order ---');
  let order: CartItem | null = null;
  
  try {
    const body: { order: CartItem } = await req.json();
    order = body.order;

    if (!order) {
      return NextResponse.json({ error: 'Missing order data' }, { status: 400 });
    }

    // Fetch user and merchant documents from Firestore
    const userDocRef = doc(db, 'users', order.userId);
    const merchantDocRef = doc(db, 'merchants', order.merchantId);
    
    const [userSnap, merchantSnap] = await Promise.all([
        getDoc(userDocRef),
        getDoc(merchantDocRef),
    ]);

    if (!userSnap.exists()) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!merchantSnap.exists()) {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const userData = userSnap.data() as User;
    const merchantData = merchantSnap.data() as Merchant;

    // Validate necessary data for the transaction
    if (!userData.seedPhrase) {
        return NextResponse.json({ error: 'User seed phrase not found' }, { status: 400 });
    }
    if (!merchantData.walletAddress) {
        return NextResponse.json({ error: 'Merchant wallet address not found' }, { status: 400 });
    }
    if (order.price <= 0) {
        return NextResponse.json({ error: 'Invalid order price' }, { status: 400 });
    }

    // --- Start Solana Transaction ---
    const connection = new Connection(getRpcUrl(), 'confirmed');
    const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);
    
    const userKeypair = keypairFromMnemonic(userData.seedPhrase);
    const merchantPublicKey = new PublicKey(merchantData.walletAddress);

    const mintInfo = await getMint(connection, tokenMintPublicKey);
    const decimals = mintInfo.decimals;
    const rawAmount = BigInt(Math.round(order.price * (10 ** decimals)));

    const fromAta = await getOrCreateAssociatedTokenAccount(
        connection, userKeypair, tokenMintPublicKey, userKeypair.publicKey
    );

    // --- PRE-TRANSACTION BALANCE CHECK ---
    const fromAtaInfo = await getAccount(connection, fromAta.address);
    if (fromAtaInfo.amount < rawAmount) {
        throw new Error(`Insufficient funds. User has ${Number(fromAtaInfo.amount) / (10 ** decimals)}, but requires ${order.price}.`);
    }
    // --- END BALANCE CHECK ---

    const toAta = await getOrCreateAssociatedTokenAccount(
        connection, userKeypair, tokenMintPublicKey, merchantPublicKey
    );

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

    // --- Update Firestore Documents ---
    await runTransaction(db, async (transaction) => {
        const freshUserSnap = await transaction.get(userDocRef);
        const freshMerchantSnap = await transaction.get(merchantDocRef);

        if (!freshUserSnap.exists() || !freshMerchantSnap.exists()) {
            throw new Error("User or Merchant document vanished during transaction");
        }

        const freshUserData = freshUserSnap.data() as User;
        const freshMerchantData = freshMerchantSnap.data() as Merchant;

        const completedOrder: CartItem = { 
            ...order,
            title: order.title,
            status: 'completed', 
            redeemedAt: new Date(),
            transactionSignature: signature 
        };

        const updatedUserCart = (freshUserData.cart || []).map((cartItem: CartItem) =>
            cartItem.orderId === order!.orderId ? completedOrder : cartItem
        );
        
        const updatedPendingOrders = (freshMerchantData.pendingOrders || []).filter((o: CartItem) => 
            o.orderId !== order!.orderId
        );
        
        // Ensure recentTransactions is an array before pushing
        const updatedTransactions = [...(freshMerchantData.recentTransactions || []), completedOrder];
        const updatedReserved = (freshMerchantData.reserved || []).filter((r: any) => r.orderId !== order!.orderId);
        
        const newMerchantBalance = (freshMerchantData.walletBalance || 0) + order!.price;
        const newUserBalance = (freshUserData.walletBalance || 0) - order!.price;

        transaction.update(userDocRef, { cart: updatedUserCart, walletBalance: newUserBalance });
        transaction.update(merchantDocRef, {
            pendingOrders: updatedPendingOrders,
            recentTransactions: updatedTransactions,
            reserved: updatedReserved,
            walletBalance: newMerchantBalance,
        });
    });

    return NextResponse.json({ signature });

  } catch (error: any) {
    console.error(`Error in redeem-order API for orderId ${order?.orderId}:`, error);

    // --- FAILURE SCENARIO: UPDATE FIRESTORE ---
    if (order && order.userId && order.merchantId) {
        try {
            const userDocRef = doc(db, 'users', order.userId);
            const merchantDocRef = doc(db, 'merchants', order.merchantId);
            
            await runTransaction(db, async (transaction) => {
                const [merchantSnap, userSnap] = await Promise.all([
                    transaction.get(merchantDocRef),
                    transaction.get(userDocRef)
                ]);

                if (!merchantSnap.exists() || !userSnap.exists()) return;

                const merchantData = merchantSnap.data() as Merchant;
                const userData = userSnap.data() as User;

                // Update order status to 'failed' in both user and merchant docs
                const failedOrder = { ...order, status: 'failed' as 'failed', error: error.message };

                const updatedUserCart = (userData.cart || []).map((item: CartItem) =>
                    item.orderId === order!.orderId ? failedOrder : item
                );
                
                const updatedPendingOrders = (merchantData.pendingOrders || []).filter(o => o.orderId !== order!.orderId);
                const updatedRecentTransactions = arrayUnion(failedOrder);

                // Return stock to inventory if it was a physical item
                 const updatedListings = updateInventory(
                    merchantData.listings || [],
                    order.listingId,
                    order.quantity
                 );

                 const updatedReserved = (merchantData.reserved || []).filter((r: any) => r.orderId !== order!.orderId);


                transaction.update(userDocRef, { cart: updatedUserCart });
                transaction.update(merchantDocRef, {
                    pendingOrders: updatedPendingOrders,
                    recentTransactions: updatedRecentTransactions,
                    listings: updatedListings,
                    reserved: updatedReserved,
                });
            });
             console.log(`Firestore updated for failed order ${order.orderId}`);
        } catch (dbError) {
            console.error(`CRITICAL: Failed to update Firestore after redemption error for order ${order.orderId}:`, dbError);
        }
    }
    // --- END FAILURE SCENARIO ---

    return NextResponse.json(
      { error: 'Failed to redeem order.', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}

    