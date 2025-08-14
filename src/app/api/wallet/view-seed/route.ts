
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { decrypt } from '@/lib/encryption';

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
