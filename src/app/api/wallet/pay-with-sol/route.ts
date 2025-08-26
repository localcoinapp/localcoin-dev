

'use client';

import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { User } from '@/types';
import * as bip39 from 'bip39';
import { siteConfig } from '@/config/site';

// Helper to get a Keypair from a mnemonic
function keypairFromMnemonic(mnemonic: string, passphrase = ''): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  return Keypair.fromSeed(seed.slice(0, 32));
}

function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}

export async function POST(req: NextRequest) {
  // --- Environment Variable Check ---
  if (!process.env.LOCALCOIN_MNEMONIC) {
    console.error('CRITICAL: Missing LOCALCOIN_MNEMONIC environment variable.');
    return NextResponse.json({ error: 'Server configuration error.', details: 'The platform wallet is not configured.' }, { status: 500 });
  }
  // ---------------------------------
  
  console.log('--- Received POST /api/wallet/pay-with-sol ---');

  try {
    const { userId, solAmount, lclAmount, currency } = await req.json();

    if (!userId || !solAmount || solAmount <= 0 || !lclAmount || lclAmount <= 0) {
      return NextResponse.json({ error: 'User ID, a positive SOL amount, and a positive LCL amount are required' }, { status: 400 });
    }

    // --- Get User's Seed Phrase from Firestore ---
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      throw new Error('User not found.');
    }
    const userData = userSnap.data() as User;
    if (!userData.seedPhrase) {
      throw new Error('User seed phrase not found. Cannot authorize transfer.');
    }
    const userKeypair = keypairFromMnemonic(userData.seedPhrase);

    // --- Get Platform's Wallet Address ---
    const platformMnemonic = process.env.LOCALCOIN_MNEMONIC;
    
    const platformKeypair = keypairFromMnemonic(platformMnemonic, process.env.LOCALCOIN_PASSPHRASE || '');
    const recipientPublicKey = platformKeypair.publicKey;

    // --- 1. Perform SOL Transfer (User -> Platform) ---
    const connection = new Connection(getRpcUrl(), 'confirmed');
    const lamportsToSend = Math.round(solAmount * LAMPORTS_PER_SOL);

    // Verify user balance
    const balance = await connection.getBalance(userKeypair.publicKey);
    if (balance < lamportsToSend) {
      throw new Error(`Insufficient SOL balance. Required: ${solAmount}, Available: ${balance / LAMPORTS_PER_SOL}`);
    }

    const solTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userKeypair.publicKey,
        toPubkey: recipientPublicKey,
        lamports: lamportsToSend,
      })
    );

    const solSignature = await sendAndConfirmTransaction(connection, solTransaction, [userKeypair]);
    console.log('SOL transfer signature:', solSignature);

    // --- 2. Perform LCL Transfer (Platform -> User) ---
    const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);
    const userPublicKey = new PublicKey(userData.walletAddress!);
    
    const mintInfo = await getMint(connection, tokenMintPublicKey);
    const decimals = mintInfo.decimals;
    const rawLclAmount = BigInt(Math.round(lclAmount * (10 ** decimals)));

    const fromAta = await getOrCreateAssociatedTokenAccount(
        connection, platformKeypair, tokenMintPublicKey, platformKeypair.publicKey
    );
    const toAta = await getOrCreateAssociatedTokenAccount(
        connection, platformKeypair, tokenMintPublicKey, userPublicKey
    );

    const lclIx = createTransferCheckedInstruction(
        fromAta.address,
        tokenMintPublicKey,
        toAta.address,
        platformKeypair.publicKey, // Platform is the owner and signer
        rawLclAmount,
        decimals
    );
    const lclTx = new Transaction().add(lclIx);
    const lclSignature = await sendAndConfirmTransaction(connection, lclTx, [platformKeypair]);
    console.log('LCL transfer signature:', lclSignature);


    // --- 3. Create Approved Purchase Record ---
    const requestsCollection = collection(db, 'tokenPurchaseRequests');
    await addDoc(requestsCollection, {
      userId: userData.id,
      userName: userData.name || userData.email,
      userWalletAddress: userData.walletAddress,
      amount: parseFloat(lclAmount), // The amount of LCL they bought
      status: 'approved',
      createdAt: serverTimestamp(),
      processedAt: serverTimestamp(),
      currency: currency,
      paymentMethod: 'crypto',
      transactionSignature: lclSignature, // Record the LCL transfer signature
      notes: `Paid with ${solAmount.toFixed(6)} SOL. Tx: ${solSignature.substring(0, 10)}...`
    });

    return NextResponse.json({ 
        message: "Payment and token transfer successful.",
        solSignature, 
        lclSignature 
    });

  } catch (error: any) {
    console.error('Error in pay-with-sol API:', error);
    return NextResponse.json(
      { error: 'Failed to process SOL payment.', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
