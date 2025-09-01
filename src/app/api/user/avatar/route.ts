
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { storageService } from '@/lib/storage';

export const runtime = 'nodejs';

// This is the API route for uploading a user's avatar.
// It handles both local and production storage environments.

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `avatar.${extension}`;
    // The destination path in the storage bucket or local directory.
    const destinationPath = `users/${userId}/${filename}`;

    // The storageService handles whether to upload to local disk or Firebase Storage.
    const url = await storageService.upload(file, destinationPath);

    // After uploading, update the user's document in Firestore with the new avatar URL.
    // This uses the CLIENT-side SDK, which is fine for this action as it's triggered
    // by the authenticated user for their own profile.
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { avatar: url });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error in avatar upload API:', error);
    return NextResponse.json(
      { error: 'Failed to save avatar', details: error.message },
      { status: 500 }
    );
  }
}
