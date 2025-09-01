
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// HOC: Firebase Admin SDK Initialization
// ============================================================================
// This ensures the Firebase Admin SDK is initialized only once per server instance.
// We are defining this locally to the API route to avoid build-time execution.

let adminApp: admin.app.App;

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    // A workaround for a known issue in the App Hosting emulator where the SDK is
    // reinitialized on every request. This is not ideal but safe.
    if (process.env.FUNCTIONS_EMULATOR) {
      return admin.app();
    }
    return admin.app();
  }

  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error('CRITICAL: FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set.');
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      return admin.app();
    }
    console.error('Error initializing Firebase Admin SDK in upload route:', error);
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}

// Lazy initialization of the app
function getAdminApp() {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }
  return adminApp;
}

const getAdminDb = () => getAdminApp().firestore();
const getAdminStorage = () => getAdminApp().storage();


// ============================================================================
// Storage Service Logic (consolidated)
// ============================================================================

// --- LOCAL STORAGE (for local dev) ---
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function uploadToLocalDisk(file: File, relativePath: string): Promise<string> {
  const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, path.basename(relativePath));
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, fileBuffer);
  return `/api/serve-uploads/${relativePath}`;
}

// --- FIREBASE STORAGE (for production) ---
async function uploadToFirebase(file: File, destinationPath: string): Promise<string> {
  const bucket = getAdminStorage().bucket();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileInBucket = bucket.file(destinationPath);
  await fileInBucket.save(fileBuffer, {
    metadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
  });
  await fileInBucket.makePublic();
  return fileInBucket.publicUrl();
}

const uploadFile = (file: File, destinationPath: string): Promise<string> => {
  if (process.env.NODE_ENV === 'production') {
    return uploadToFirebase(file, destinationPath);
  }
  return uploadToLocalDisk(file, destinationPath);
};


// ============================================================================
// API Route Handler
// ============================================================================
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

    const url = await uploadFile(file, destinationPath);
    
    const adminDb = getAdminDb();
    const merchantDocRef = adminDb.collection('merchants').doc(merchantId);
    
    await merchantDocRef.update({ [fileType]: url });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error in upload API:', error);
    // Ensure you don't leak sensitive details in production
    const errorMessage = error.message || 'An unknown error occurred during upload.';
    return NextResponse.json(
      { error: 'Failed to save file', details: errorMessage },
      { status: 500 }
    );
  }
}
