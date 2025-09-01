
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';

// ===================================================================
// Firebase Admin SDK Initialization (Singleton Pattern)
// This ensures the SDK is initialized only once per server instance.
// ===================================================================
function initializeAdminApp() {
  // Check if the app is already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!serviceAccount || !storageBucket) {
    throw new Error('CRITICAL: Firebase Admin credentials or storage bucket are not set in the environment.');
  }
  
  try {
    const credential = admin.credential.cert(JSON.parse(serviceAccount));
    return admin.initializeApp({
      credential,
      storageBucket,
    });
  } catch (error: any) {
    // Catch specific error for duplicate app initialization in case of race conditions.
    if (error.code === 'app/duplicate-app') {
      return admin.app();
    }
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}


// ===================================================================
// File Upload Logic
// ===================================================================
async function uploadToFirebase(file: File, destinationPath: string): Promise<string> {
  const adminApp = initializeAdminApp();
  const bucket = adminApp.storage().bucket();
  
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

async function uploadToLocalDisk(file: File, relativePath: string): Promise<string> {
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
  await fs.mkdir(directory, { recursive: true });

  const filePath = path.join(directory, path.basename(relativePath));
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, fileBuffer);

  return `/api/serve-uploads/${relativePath}`;
}

// ===================================================================
// API Route Handler (POST)
// ===================================================================
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
    
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${fileType}-${Date.now()}.${extension}`;
    const destinationPath = `merchants/${merchantId}/${filename}`;
    
    let url: string;
    // The reliable way to check for production in a Next.js environment
    if (process.env.NODE_ENV === 'production') {
        url = await uploadToFirebase(file, destinationPath);
    } else {
        url = await uploadToLocalDisk(file, destinationPath);
    }
    
    // Initialize admin and update Firestore
    const adminApp = initializeAdminApp();
    const adminDb = adminApp.firestore();
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
