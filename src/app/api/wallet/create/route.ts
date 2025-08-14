
import { NextRequest, NextResponse } from 'next/server';
import * as bip39 from "bip39";
import { Keypair } from "@solana/web3.js";
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import crypto from 'crypto';

// --- Encryption Logic ---
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

const getKey = (salt: Buffer): Buffer => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set.');
    }
    return crypto.pbkdf2Sync(key, salt, ITERATIONS, KEY_LENGTH, 'sha512');
};

const encrypt = (text: string): string => {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = getKey(salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('hex');
};
// --- End Encryption Logic ---

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
