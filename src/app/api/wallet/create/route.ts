
import { NextRequest, NextResponse } from 'next/server';
import * as bip39 from "bip39";
import { Keypair } from "@solana/web3.js";
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { encrypt } from '@/lib/encryption';

export async function POST(req: NextRequest) {
    const { userId, userType } = await req.json();

    if (!userId || !userType || !['user', 'merchant'].includes(userType)) {
        return NextResponse.json({ error: 'Missing or invalid userId or userType' }, { status: 400 });
    }

    const collectionName = userType === 'user' ? 'users' : 'merchants';
    const docRef = doc(db, collectionName, userId);

    try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            return NextResponse.json({ error: `${userType} not found` }, { status: 404 });
        }
        if (docSnap.data()?.walletAddress) {
            return NextResponse.json({ error: 'Wallet already exists' }, { status: 409 });
        }

        const mnemonic = bip39.generateMnemonic();
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const keypair = Keypair.fromSeed(seed.slice(0, 32));
        const walletAddress = keypair.publicKey.toBase58();

        const encryptedSeedPhrase = encrypt(mnemonic);

        await updateDoc(docRef, {
            walletAddress: walletAddress,
            seedPhrase: encryptedSeedPhrase,
        });

        // Return the unencrypted phrase to the user ONE TIME
        return NextResponse.json({
            walletAddress,
            seedPhrase: mnemonic,
        });

    } catch (error) {
        console.error(`Error creating wallet for ${userType} ${userId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: 'Failed to create wallet.', details: errorMessage }, { status: 500 });
    }
}
