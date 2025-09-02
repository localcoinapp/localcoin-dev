'use server';

import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Helper function to initialize Firebase Admin SDK
// This ensures it's only initialized once per server instance.
const initializeAdmin = () => {
  const RAW_SERVICE_ACCOUNT = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const BUCKET_URL = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!getApps().length) {
    initializeApp({
      credential: RAW_SERVICE_ACCOUNT ? cert(JSON.parse(RAW_SERVICE_ACCOUNT)) : applicationDefault(),
      storageBucket: BUCKET_URL,
    });
  }
};

export async function uploadFileAction(formData: FormData): Promise<{ url: string }> {
  try {
    initializeAdmin();

    const firestore = getFirestore();
    const storage = getStorage();

    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'merchant' | 'user';
    const id = formData.get('id') as string | null;
    const fileType = formData.get('fileType') as 'logo' | 'banner' | 'avatar' | null;

    if (!file || !type || !id || !fileType) {
      throw new Error('Missing required form data (file, type, id, fileType).');
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = fileType === 'avatar' ? `avatar.${extension}` : `${fileType}-${Date.now()}.${extension}`;
    const destinationPath = `${type}s/${id}/${filename}`;

    const bucket = storage.bucket();
    const fileInBucket = bucket.file(destinationPath);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await fileInBucket.save(fileBuffer, {
      metadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const [signedUrl] = await fileInBucket.getSignedUrl({
      action: 'read',
      expires: '2150-01-01',
    });
    
    const collectionName = type === 'merchant' ? 'merchants' : 'users';
    const fieldToUpdate = fileType === 'avatar' ? 'avatar' : fileType;

    await firestore.collection(collectionName).doc(id).update({
      [fieldToUpdate]: signedUrl,
    });

    return { url: signedUrl };

  } catch (error: any) {
    console.error('Error in uploadFileAction:', error);
    // Re-throw a plain error object to avoid leaking server-side details to the client
    throw new Error(`Upload failed: ${error.message}`);
  }
}
