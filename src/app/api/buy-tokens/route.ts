
import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, clusterApiUrl, Transaction, sendAndConfirmTransaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { siteConfig } from '@/config/site';

export async function POST(req: NextRequest) {
    try {
        const { recipient, amount } = await req.json();

        if (!recipient || !amount) {
            return NextResponse.json({ error: 'Missing recipient address or amount' }, { status: 400 });
        }

        // --- SECURITY WARNING ---
        // This is where you would securely load your issuer's private key from an environment variable.
        // The private key for the main issuing wallet (4ADvsfQFwdwZBwMFMmxgoVzsWuAEGKTcAtRfxzHMruUG)
        // must be set in your deployment environment as ISSUER_PRIVATE_KEY.
        const issuerPrivateKeyString = process.env.ISSUER_PRIVATE_KEY;
        if (!issuerPrivateKeyString) {
            throw new Error("Issuer private key is not configured on the server. Please set the ISSUER_PRIVATE_KEY environment variable.");
        }
        
        // The private key is expected to be a stringified array of numbers (e.g., "[1,2,3,...]")
        const issuerPrivateKey = Uint8Array.from(JSON.parse(issuerPrivateKeyString));
        const issuerKeypair = Keypair.fromSecretKey(issuerPrivateKey);
        const recipientPublicKey = new PublicKey(recipient);
        const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);

        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

        // Get or create the issuer's token account
        const issuerTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            issuerKeypair, // Payer
            tokenMintPublicKey,
            issuerKeypair.publicKey
        );
        
        // Get or create the recipient's token account
        // The issuer (payer) will fund the creation if it doesn't exist
        const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            issuerKeypair, // Payer
            tokenMintPublicKey,
            recipientPublicKey
        );

        const transaction = new Transaction().add(
            createTransferInstruction(
                issuerTokenAccount.address,
                recipientTokenAccount.address,
                issuerKeypair.publicKey,
                amount * (10 ** 9), // Amount in the smallest unit (lamports for this token)
                [],
                TOKEN_PROGRAM_ID
            )
        );

        const signature = await sendAndConfirmTransaction(connection, transaction, [issuerKeypair]);

        return NextResponse.json({ signature });

    } catch (error) {
        console.error('Error in buy-tokens API:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: 'Failed to process token purchase.', details: errorMessage }, { status: 500 });
    }
}
