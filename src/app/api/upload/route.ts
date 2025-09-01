
import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/storage';
import { adminDb } from '@/lib/firebase-admin'; // Use the initialized adminDb directly

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
    
    // Generate a unique filename to avoid caching issues
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${fileType}-${Date.now()}.${extension}`;
    const destinationPath = `merchants/${merchantId}/${filename}`;

    const url = await storageService.upload(file, destinationPath);
    
    // Get Firestore instance via the admin SDK helper
    const merchantDocRef = adminDb.collection('merchants').doc(merchantId);
    
    // Update the specific field (logo or banner)
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
