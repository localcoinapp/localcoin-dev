
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Helper function to initialize Firebase Admin SDK safely.
  // It ensures the SDK is initialized only once per server instance.
  function initializeAdminApp() {
    if (admin.apps.length > 0) {
      return admin.app();
    }

    const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    if (!serviceAccount) {
      throw new Error('CRITICAL: FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set.');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  // Local storage for development
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  async function uploadToLocalDisk(file: File, relativePath: string): Promise<string> {
    const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
    await fs.mkdir(directory, { recursive: true });

    const filePath = path.join(directory, path.basename(relativePath));
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);

    return `/api/serve-uploads/${relativePath}`;
  }

  // Firebase Storage for production
  async function uploadToFirebase(app: admin.app.App, file: File, destinationPath: string): Promise<string> {
    const bucket = app.storage().bucket();
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileInBucket = bucket.file(destinationPath);

    await fileInBucket.save(fileBuffer, {
      metadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
    });

    await fileInBucket.makePublic();
    
    return fileInBucket.publicUrl();
  }


  try {
    const adminApp = initializeAdminApp();
    const adminDb = adminApp.firestore();

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
    
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${fileType}-${Date.now()}.${extension}`;
    const destinationPath = `merchants/${merchantId}/${filename}`;
    
    let url: string;
    if (process.env.NODE_ENV === 'production') {
      url = await uploadToFirebase(adminApp, file, destinationPath);
    } else {
      url = await uploadToLocalDisk(file, destinationPath);
    }
    
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
