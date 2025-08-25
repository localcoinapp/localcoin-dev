
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/types';

// IMPORTANT: This is a highly sensitive endpoint.
// In a production environment, this should have additional security measures,
// such as requiring password re-authentication before viewing the seed phrase.

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // This is a simplified check. A real app should verify the currently authenticated user's token
    // to ensure they are only requesting their own seed phrase.
    // For now, we fetch the document based on the provided ID.

    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const userData = userSnap.data() as User;
    const seedPhrase = userData.seedPhrase;

    if (!seedPhrase) {
      return NextResponse.json({ error: 'Seed phrase not found for this user.' }, { status: 404 });
    }

    // In a real-world scenario, you would decrypt the seed phrase here.
    // For this project, we are returning it directly.
    return NextResponse.json({ seedPhrase });

  } catch (error: any) {
    console.error('Error fetching seed phrase:', error);
    return NextResponse.json({ error: 'Failed to fetch seed phrase.', details: error.message }, { status: 500 });
  }
}
