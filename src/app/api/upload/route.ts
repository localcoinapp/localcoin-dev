
import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/storage';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const merchantId = formData.get('merchantId') as string | null;
    const fileType = formData.get('fileType') as 'logo' | 'banner' | null;

    if (!file || !merchantId || !fileType) {
      return NextResponse.json(
        { error: 'Missing file, merchantId, or fileType' },
        { status: 400 }
      );
    }
    
    // Standardize filename
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${fileType}.${extension}`;
    const destinationPath = `merchants/${merchantId}/${filename}`;

    // Use the storage service to upload the file
    const url = await storageService.upload(file, destinationPath);
    
    // Use Admin SDK to update Firestore from the server
    const adminDb = getFirebaseAdminApp().firestore();
    const merchantDocRef = adminDb.collection('merchants').doc(merchantId);
    await merchantDocRef.update({ [fileType]: url });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { error: 'Failed to save file', details: error.message },
      { status: 500 }
    );
  }
}
