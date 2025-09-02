
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Helper to initialize Firebase Admin SDK for Firestore updates
// This ensures it's only initialized once per server instance.
const initializeAdmin = () => {
  if (!getApps().length) {
    const RAW_SERVICE_ACCOUNT = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    initializeApp({
      credential: RAW_SERVICE_ACCOUNT ? cert(JSON.parse(RAW_SERVICE_ACCOUNT)) : applicationDefault(),
    });
  }
};


// This is the base directory on the server's filesystem where uploads will be stored.
// For local development, it creates a folder named 'uploads' in your project root.
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function uploadFileAction(formData: FormData): Promise<{ url: string }> {
  try {
    initializeAdmin();
    const firestore = getFirestore();

    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'merchant' | 'user';
    const id = formData.get('id') as string | null;
    const fileType = formData.get('fileType') as 'logo' | 'banner' | 'avatar' | null;

    if (!file || !type || !id || !fileType) {
      throw new Error('Missing required form data (file, type, id, fileType).');
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = fileType === 'avatar' ? `avatar.${extension}` : `${fileType}-${Date.now()}.${extension}`;
    
    // e.g., 'users/USER_ID/avatar.png' or 'merchants/MERCHANT_ID/logo-12345.png'
    const relativePath = path.join(`${type}s`, id, filename);
    const absolutePath = path.join(UPLOAD_DIR, relativePath);

    // Create the directory if it doesn't exist
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    // Write the file to the local disk
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absolutePath, fileBuffer);
    
    // The URL that the client will use to fetch the image via our new API route
    const url = `/api/serve-uploads/${relativePath.replace(/\\/g, '/')}`;

    // Update Firestore with the local URL
    const collectionName = type === 'merchant' ? 'merchants' : 'users';
    const fieldToUpdate = fileType === 'avatar' ? 'avatar' : fileType;

    await firestore.collection(collectionName).doc(id).update({
      [fieldToUpdate]: url,
    });

    return { url: url };

  } catch (error: any) {
    console.error('Error in uploadFileAction:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}
