
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { storageService } from '@/lib/storage';

export const runtime = 'nodejs';

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
    const destinationPath = `users/${userId}/${filename}`;

    // Use the storage service to upload the file
    const url = await storageService.upload(file, destinationPath);

    // Update Firestore with the returned URL
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
