import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// This should be securely retrieved from environment variables or a secure system
// **IMPORTANT**: Never hardcode or expose private keys directly in code.
const adminSecretKey = process.env.ADMIN_WALLET_SECRET_KEY;

if (!adminSecretKey) {
  throw new Error('ADMIN_WALLET_SECRET_KEY is not set');
}

const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(adminSecretKey)));
const connection = new Connection('https://api.devnet.solana.com', 'confirmed'); // Use appropriate network

export async function POST(req: NextRequest) {
  try {
    const { userWalletAddress } = await req.json();

    if (!userWalletAddress) {
      return NextResponse.json({ error: 'User wallet address is required' }, { status: 400 });
    }

    const userPublicKey = new PublicKey(userWalletAddress);

    const lamportsToSend = 0.0025 * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: adminKeypair.publicKey,
        toPubkey: userPublicKey,
        lamports: lamportsToSend,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminKeypair.publicKey;

    transaction.sign(adminKeypair);

    const signature = await connection.sendRawTransaction(transaction.serialize());

    await connection.confirmTransaction(signature, 'confirmed');

    return NextResponse.json({ message: 'SOL successfully issued', signature });
  } catch (error: any) {
    console.error('Error issuing SOL:', error);
    return NextResponse.json({ error: 'Failed to issue SOL', details: error.message }, { status: 500 });
  }
}