
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; // Use the initialized adminDb directly
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

    const url = await storageService.upload(file, destinationPath);

    const userDocRef = adminDb.collection("users").doc(userId);
    await userDocRef.update({ avatar: url });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error in avatar upload API:', error);
    return NextResponse.json(
      { error: 'Failed to save avatar', details: error.message },
      { status: 500 }
    );
  }
}
