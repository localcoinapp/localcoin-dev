
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';

// --- Helper Functions (self-contained in this route) ---

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This is a "singleton" pattern to avoid re-initialization on every API call.
 */
function initializeAdminApp() {
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
    if (error.code === 'app/duplicate-app') {
      return admin.app();
    }
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}

/**
 * A storage service that abstracts away the differences between local and production environments.
 */
const storageService = {
  upload: (file: File, destinationPath: string): Promise<string> => {
    if (process.env.NODE_ENV === 'production') {
      const adminApp = initializeAdminApp();
      const bucket = adminApp.storage().bucket();
      
      return async function uploadToFirebase() {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileInBucket = bucket.file(destinationPath);
        await fileInBucket.save(fileBuffer, {
          metadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
        });
        await fileInBucket.makePublic();
        return fileInBucket.publicUrl();
      }();
    } else {
      const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
      return async function uploadToLocalDisk() {
        const directory = path.join(UPLOAD_DIR, path.dirname(destinationPath));
        await fs.mkdir(directory, { recursive: true });
        const filePath = path.join(directory, path.basename(destinationPath));
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, fileBuffer);
        return `/api/serve-uploads/${destinationPath}`;
      }();
    }
  },
};


// --- API Route Handler ---

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

    // Use the self-contained storage service
    const url = await storageService.upload(file, destinationPath);
    
    // Get Firestore instance via the initialized admin app
    const adminDb = initializeAdminApp().firestore();
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
