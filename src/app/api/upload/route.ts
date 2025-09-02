
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Initializes the Firebase Admin SDK safely, only when needed.
 * This function is designed to run only at runtime on the server, not during the build.
 */
async function getAdminInstances() {
  const { getApps, initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getStorage } = await import('firebase-admin/storage');

  // Check if an app is already initialized to prevent errors.
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!serviceAccount || !storageBucket) {
        throw new Error('CRITICAL: Firebase Admin credentials or storage bucket are not set in the environment.');
    }
    
    initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      storageBucket: storageBucket,
    });
  }
  return { firestore: getFirestore(), storage: getStorage() };
}

export async function POST(req: NextRequest) {
  // This check prevents the function from executing during the build process.
  if (process.env.NODE_ENV === 'production' && !process.env.K_SERVICE) {
    return new NextResponse('Service unavailable during build phase', { status: 503 });
  }

  try {
    const { firestore, storage } = await getAdminInstances();
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
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) {
        throw new Error("Firebase Storage bucket name is not configured.");
      }
      const bucket = storage.bucket(bucketName);
      const fileInBucket = bucket.file(destinationPath);
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await fileInBucket.save(fileBuffer, {
        metadata: {
          contentType: file.type,
          cacheControl: 'public, max-age=31536000',
        },
      });
      await fileInBucket.makePublic();
      url = fileInBucket.publicUrl();
    } else {
      const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
      const relativePath = `merchants/${merchantId}/${filename}`;
      const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
      await fs.mkdir(directory, { recursive: true });
      const filePath = path.join(directory, path.basename(relativePath));
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, fileBuffer);
      url = `/api/serve-uploads/${relativePath}`;
    }
    
    const merchantDocRef = firestore.collection('merchants').doc(merchantId);
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
