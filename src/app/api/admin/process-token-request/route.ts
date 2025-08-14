
import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, clusterApiUrl, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferCheckedInstruction, getMint } from '@solana/spl-token';
import { siteConfig } from '@/config/site';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { TokenPurchaseRequest } from '@/types';
import * as bip39 from 'bip39';


export async function POST(req: NextRequest) {
    console.log("Received POST request to /api/admin/process-token-request");

    const { requestId } = await req.json();
    console.log(`Processing request ID: ${requestId}`);

    if (!requestId) {
        console.error("Missing requestId in request body");
        return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
    }
    
    const requestRef = doc(db, 'tokenPurchaseRequests', requestId);

    try {
        const mnemonic = "extend deliver wait margin attend bean unaware skate silly cruel rose reveal";
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const issuerKeypair = Keypair.fromSeed(seed.slice(0, 32));
        console.log(`Issuer public key: ${issuerKeypair.publicKey.toBase58()}`);
        
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists() || requestSnap.data()?.status !== 'pending') {
            console.error("Invalid or already processed request.");
            return NextResponse.json({ error: 'Invalid or already processed request.' }, { status: 404 });
        }
        const requestData = requestSnap.data() as TokenPurchaseRequest;
        console.log("Request data from Firestore:", requestData);

        const { userWalletAddress: recipient, amount } = requestData;

        const recipientPublicKey = new PublicKey(recipient);
        const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);
        
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        console.log("Connected to Solana devnet.");

        // Fetch the mint information to get the correct number of decimals
        const mintInfo = await getMint(connection, tokenMintPublicKey);
        const decimals = mintInfo.decimals;
        console.log(`Token decimals fetched from chain: ${decimals}`);

        const fromAta = await getOrCreateAssociatedTokenAccount(
            connection,
            issuerKeypair, // Payer
            tokenMintPublicKey,
            issuerKeypair.publicKey
        );
        const toAta = await getOrCreateAssociatedTokenAccount(
            connection,
            issuerKeypair, // Payer
            tokenMintPublicKey,
            recipientPublicKey
        );

        console.log("Creating transfer instruction...");
        const transaction = new Transaction().add(
             createTransferCheckedInstruction(
                fromAta.address, // from
                tokenMintPublicKey, // mint
                toAta.address, // to
                issuerKeypair.publicKey, // from owner
                amount * (10 ** decimals), // amount, adjusted for decimals
                decimals // decimals
            )
        );
        console.log("Transfer instruction created. Sending and confirming transaction...");

        const signature = await sendAndConfirmTransaction(connection, transaction, [issuerKeypair]);
        console.log(`Transaction successful with signature: ${signature}`);
        
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
        
        try {
            const requestDoc = await getDoc(requestRef);
            if (requestDoc.exists()) {
                await updateDoc(requestRef, { status: 'denied', processedAt: serverTimestamp() });
            }
        } catch (dbError) {
             console.error('Additionally, failed to update request status to denied in Firestore:', dbError);
        }

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: 'Failed to process token purchase.', details: errorMessage }, { status: 500 });
    }
}
