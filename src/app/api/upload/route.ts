
import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/storage';
import { getAdminFirestore } from '@/lib/firebase-admin'; // Use the Admin SDK for server-side DB operations

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
    
    // --- FIX: Use Admin SDK to update Firestore from the server ---
    const adminDb = getAdminFirestore();
    const merchantDocRef = adminDb.collection('merchants').doc(merchantId);
    await merchantDocRef.update({ [fileType]: url });
    // -------------------------------------------------------------

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error in upload API:', error);
    // Provide a more specific error message if it's a known initialization issue.
    if (error.message.includes('FIREBASE_ADMIN_SERVICE_ACCOUNT')) {
       return NextResponse.json(
        { 
          error: 'Server configuration error.', 
          details: 'The Firebase Admin credentials are not set for the local development environment. Please add FIREBASE_ADMIN_SERVICE_ACCOUNT to your .env file.' 
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to save file', details: error.message },
      { status: 500 }
    );
  }
}
