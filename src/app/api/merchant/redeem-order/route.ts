
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
} from '@solana/spl-token';
import { siteConfig } from '@/config/site';
import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import type { User, Merchant, CartItem } from '@/types';
import * as bip39 from 'bip39';

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
  let orderId: string | null = null;
  try {
    const { order }: { order: CartItem } = await req.json();
    orderId = order.orderId;

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
    
    // Create keypair for the user (sender) from their seed phrase
    const userKeypair = keypairFromMnemonic(userData.seedPhrase);
    const merchantPublicKey = new PublicKey(merchantData.walletAddress);

    const mintInfo = await getMint(connection, tokenMintPublicKey);
    const decimals = mintInfo.decimals;
    const rawAmount = BigInt(order.price * (10 ** decimals));

    // Get or create Associated Token Accounts for both user and merchant
    const fromAta = await getOrCreateAssociatedTokenAccount(
        connection, userKeypair, tokenMintPublicKey, userKeypair.publicKey
    );
    const toAta = await getOrCreateAssociatedTokenAccount(
        connection, userKeypair, tokenMintPublicKey, merchantPublicKey
    );

    // Build the transaction
    const ix = createTransferCheckedInstruction(
        fromAta.address,
        tokenMintPublicKey,
        toAta.address,
        userKeypair.publicKey, // User is the signer
        rawAmount,
        decimals
    );
    const tx = new Transaction().add(ix);
    
    // Sign and send the transaction
    const signature = await sendAndConfirmTransaction(connection, tx, [userKeypair]);
    console.log('Redemption Transfer Signature:', signature);

    // --- End Solana Transaction ---

    // --- Update Firestore Documents ---
    await runTransaction(db, async (transaction) => {
        const freshUserSnap = await transaction.get(userDocRef);
        const freshMerchantSnap = await transaction.get(merchantDocRef);

        if (!freshUserSnap.exists() || !freshMerchantSnap.exists()) {
            throw new Error("User or Merchant document vanished during transaction");
        }

        const freshUserData = freshUserSnap.data();
        const freshMerchantData = freshMerchantSnap.data();

        const completedOrder = { 
            ...order, 
            status: 'completed', 
            redeemedAt: new Date(),
            transactionSignature: signature 
        };

        // Update user's cart
        const updatedUserCart = (freshUserData.cart || []).map((cartItem: CartItem) =>
            cartItem.orderId === order.orderId ? completedOrder : cartItem
        );
        
        // Update merchant's pending orders
        const updatedPendingOrders = (freshMerchantData.pendingOrders || []).map((o: CartItem) => 
            o.orderId === order.orderId ? completedOrder : o
        );
        
        const updatedTransactions = [...(freshMerchantData.recentTransactions || []), completedOrder];
        const updatedReserved = (freshMerchantData.reserved || []).filter((r: any) => r.orderId !== order.orderId);
        
        const newMerchantBalance = (freshMerchantData.walletBalance || 0) + order.price;

        transaction.update(userDocRef, { cart: updatedUserCart });
        transaction.update(merchantDocRef, {
            pendingOrders: updatedPendingOrders,
            recentTransactions: updatedTransactions,
            reserved: updatedReserved,
            walletBalance: newMerchantBalance,
        });
    });

    return NextResponse.json({ signature });

  } catch (error: any) {
    console.error(`Error in redeem-order API for orderId ${orderId}:`, error);
    // Optionally update the order to a 'failed' state in Firestore here
    return NextResponse.json(
      { error: 'Failed to redeem order.', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
