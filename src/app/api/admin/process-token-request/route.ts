import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, clusterApiUrl, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { siteConfig } from '@/config/site';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { TokenPurchaseRequest } from '@/types';


export async function POST(req: NextRequest) {
    try {
        const { requestId } = await req.json();

        if (!requestId) {
            return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
        }

        // --- SECURITY WARNING ---
        // This private key for the main issuing wallet (4ADvsfQFwdwZBwMFMmxgoVzsWuAEGKTcAtRfxzHMruUG)
        // must be set in your deployment environment as ISSUER_PRIVATE_KEY.
        const issuerPrivateKeyString = process.env.ISSUER_PRIVATE_KEY;
        if (!issuerPrivateKeyString) {
            console.error("CRITICAL: ISSUER_PRIVATE_KEY environment variable is not set.");
            return NextResponse.json({ error: 'The server is not configured for token purchases. Please contact support.' }, { status: 500 });
        }
        
        // Fetch the request from Firestore
        const requestRef = doc(db, 'tokenPurchaseRequests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists() || requestSnap.data()?.status !== 'pending') {
            return NextResponse.json({ error: 'Invalid or already processed request.' }, { status: 404 });
        }
        const requestData = requestSnap.data() as TokenPurchaseRequest;

        const { userWalletAddress: recipient, amount } = requestData;

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

        // Update the request status in Firestore
        await updateDoc(requestRef, {
            status: 'completed',
            processedAt: serverTimestamp(),
            transactionSignature: signature
        });

        return NextResponse.json({ signature });

    } catch (error) {
        console.error('Error in process-token-request API:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: 'Failed to process token purchase.', details: errorMessage }, { status: 500 });
    }
}
