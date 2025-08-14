
import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, clusterApiUrl, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { siteConfig } from '@/config/site';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import type { TokenPurchaseRequest, User } from '@/types';


export async function POST(req: NextRequest) {
    console.log("Received POST request to /api/admin/process-token-request");

    try {
        const { requestId } = await req.json();
        console.log(`Processing request ID: ${requestId}`);

        if (!requestId) {
            console.error("Missing requestId in request body");
            return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
        }

        // --- SECURITY WARNING & VALIDATION ---
        console.log("Loading ISSUER_PRIVATE_KEY from environment variables...");
        const issuerPrivateKeyString = process.env.ISSUER_PRIVATE_KEY;
        if (!issuerPrivateKeyString) {
            console.error("CRITICAL: ISSUER_PRIVATE_KEY environment variable is not set.");
            return NextResponse.json({ error: 'Server configuration error: The issuer wallet is not configured.' }, { status: 500 });
        }
        
        let issuerPrivateKey: Uint8Array;
        try {
            const parsedKey = JSON.parse(issuerPrivateKeyString);
            if (!Array.isArray(parsedKey) || parsedKey.some(isNaN)) {
                throw new Error("Private key is not a valid array of numbers.");
            }
            issuerPrivateKey = Uint8Array.from(parsedKey);
            if (issuerPrivateKey.length !== 64) {
                 throw new Error(`Invalid private key length. Expected 64 bytes, got ${issuerPrivateKey.length}.`);
            }
            console.log("Successfully parsed ISSUER_PRIVATE_KEY.");
        } catch (e) {
            console.error("CRITICAL: Failed to parse ISSUER_PRIVATE_KEY. It must be a stringified array of 64 numbers.", e);
            return NextResponse.json({ error: 'Server configuration error: The issuer wallet key is malformed.' }, { status: 500 });
        }
        
        const issuerKeypair = Keypair.fromSecretKey(issuerPrivateKey);
        console.log(`Issuer public key: ${issuerKeypair.publicKey.toBase58()}`);
        
        // Fetch the request from Firestore
        console.log(`Fetching request document from Firestore: tokenPurchaseRequests/${requestId}`);
        const requestRef = doc(db, 'tokenPurchaseRequests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists() || requestSnap.data()?.status !== 'pending') {
            console.error("Invalid or already processed request.");
            return NextResponse.json({ error: 'Invalid or already processed request.' }, { status: 404 });
        }
        const requestData = requestSnap.data() as TokenPurchaseRequest;
        console.log("Request data from Firestore:", requestData);

        const { userWalletAddress: recipient, amount, userId } = requestData;

        const recipientPublicKey = new PublicKey(recipient);
        const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);
        console.log(`Recipient public key: ${recipientPublicKey.toBase58()}`);
        console.log(`Token mint public key: ${tokenMintPublicKey.toBase58()}`);

        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        console.log("Connected to Solana devnet.");

        // Get or create the recipient's token account.
        console.log("Getting or creating recipient's token account...");
        const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            issuerKeypair, // Payer
            tokenMintPublicKey,
            recipientPublicKey
        );
        console.log(`Recipient's token account address: ${recipientTokenAccount.address.toBase58()}`);


         // Get or create the issuer's token account (less likely to be needed, but good practice)
        console.log("Getting or creating issuer's token account...");
        const issuerTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            issuerKeypair, // Payer
            tokenMintPublicKey,
            issuerKeypair.publicKey
        );
        console.log(`Issuer's token account address: ${issuerTokenAccount.address.toBase58()}`);

        console.log("Creating transfer instruction...");
        const transaction = new Transaction().add(
            createTransferInstruction(
                issuerTokenAccount.address,
                recipientTokenAccount.address,
                issuerKeypair.publicKey,
                amount * (10 ** siteConfig.token.decimals), // Use decimals from config
                [],
                TOKEN_PROGRAM_ID
            )
        );
        console.log("Transfer instruction created. Sending and confirming transaction...");

        const signature = await sendAndConfirmTransaction(connection, transaction, [issuerKeypair]);
        console.log(`Transaction successful with signature: ${signature}`);
        
        // After successful on-chain transaction, only update the request status in Firestore.
        console.log("Updating Firestore document status to 'completed'...");
        await updateDoc(requestRef, {
            status: 'completed',
            processedAt: serverTimestamp(),
            transactionSignature: signature
        });
        console.log("Firestore document updated. Sending successful response.");

        return NextResponse.json({ signature });

    } catch (error) {
        console.error('Error in process-token-request API:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: 'Failed to process token purchase.', details: errorMessage }, { status: 500 });
    }
}
