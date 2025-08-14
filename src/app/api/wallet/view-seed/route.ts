
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import crypto from 'crypto';

// --- Decryption Logic ---
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

const decrypt = (encryptedText: string): string => {
    const data = Buffer.from(encryptedText, 'hex');
    
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = getKey(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};
// --- End Decryption Logic ---

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

        const data = docSnap.data();
        const encryptedSeedPhrase = data.seedPhrase;

        if (!encryptedSeedPhrase) {
            return NextResponse.json({ error: 'Seed phrase not found for this account.' }, { status: 404 });
        }

        const seedPhrase = decrypt(encryptedSeedPhrase);

        return NextResponse.json({ seedPhrase });

    } catch (error) {
        console.error(`Error decrypting seed for ${userType} ${userId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        // Don't leak specific crypto errors to the client
        return NextResponse.json({ error: 'Failed to retrieve seed phrase.' }, { status: 500 });
    }
}
