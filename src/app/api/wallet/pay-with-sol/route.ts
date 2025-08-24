
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
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/types';
import * as bip39 from 'bip39';

// Helper to get a Keypair from a mnemonic
function keypairFromMnemonic(mnemonic: string, passphrase = ''): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  return Keypair.fromSeed(seed.slice(0, 32));
}

function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}

export async function POST(req: NextRequest) {
  console.log('--- Received POST /api/wallet/pay-with-sol ---');

  try {
    const { userId, amount: solAmount } = await req.json();

    if (!userId || !solAmount || solAmount <= 0) {
      return NextResponse.json({ error: 'User ID and a positive SOL amount are required' }, { status: 400 });
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
    if (!platformMnemonic) {
      throw new Error('Platform wallet not configured (set LOCALCOIN_MNEMONIC)');
    }
    const platformKeypair = keypairFromMnemonic(platformMnemonic, process.env.LOCALCOIN_PASSPHRASE || '');
    const recipientPublicKey = platformKeypair.publicKey;

    // --- Perform SOL Transfer ---
    const connection = new Connection(getRpcUrl(), 'confirmed');
    const lamportsToSend = solAmount * LAMPORTS_PER_SOL;

    // Verify user balance
    const balance = await connection.getBalance(userKeypair.publicKey);
    if (balance < lamportsToSend) {
      throw new Error(`Insufficient SOL balance. Required: ${solAmount}, Available: ${balance / LAMPORTS_PER_SOL}`);
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userKeypair.publicKey,
        toPubkey: recipientPublicKey,
        lamports: lamportsToSend,
      })
    );

    // Sign with the SENDER's (user's) keypair
    const signature = await sendAndConfirmTransaction(connection, transaction, [userKeypair]);
    console.log('SOL transfer signature:', signature);

    return NextResponse.json({ signature });

  } catch (error: any) {
    console.error('Error in pay-with-sol API:', error);
    return NextResponse.json(
      { error: 'Failed to process SOL payment.', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
