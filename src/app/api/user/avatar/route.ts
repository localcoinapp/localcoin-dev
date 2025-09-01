
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';


// ============================================================================
// HOC: Firebase Admin SDK Initialization
// ============================================================================
// This ensures the Firebase Admin SDK is initialized only once per server instance.

let adminApp: admin.app.App;

function initializeAdminApp() {
  if (admin.apps.length > 0) {
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
    console.error('Error initializing Firebase Admin SDK in avatar route:', error);
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

const getAdminStorage = () => getAdminApp().storage();


// ============================================================================
// Storage Service Logic (consolidated)
// ============================================================================

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function uploadToLocalDisk(file: File, relativePath: string): Promise<string> {
  const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, path.basename(relativePath));
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, fileBuffer);
  return `/api/serve-uploads/${relativePath}`;
}

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
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `avatar.${extension}`;
    const destinationPath = `users/${userId}/${filename}`;

    const url = await uploadFile(file, destinationPath);

    // Update Firestore with the returned URL.
    // Note: This uses the client SDK. For server-side updates, you'd use the adminDb.
    // Given the context of a user updating their own avatar, this is acceptable.
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
