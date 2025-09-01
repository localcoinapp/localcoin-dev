
'use server';

import { getFirebaseAdminApp } from '@/lib/firebase-admin';
import {promises as fs} from 'fs';
import path from 'path';

// ======================= LOCAL STORAGE IMPLEMENTATION =======================
// This is intended for local development only.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function uploadToLocalDisk(file: File, relativePath: string): Promise<string> {
  const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
  await fs.mkdir(directory, { recursive: true });

  const filePath = path.join(directory, path.basename(relativePath));
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, fileBuffer);

  // Return a URL path that can be served by our /api/serve-uploads route
  return `/api/serve-uploads/${relativePath}`;
}


// ===================== FIREBASE STORAGE IMPLEMENTATION ======================
// This is for all deployed environments (staging, production).
async function uploadToFirebase(file: File, destinationPath: string): Promise<string> {
  const adminApp = getFirebaseAdminApp();
  const bucket = adminApp.storage().bucket();
  
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileInBucket = bucket.file(destinationPath);

  await fileInBucket.save(fileBuffer, {
    metadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
    },
  });

  // Make the file public and return its URL.
  await fileInBucket.makePublic();
  return fileInBucket.publicUrl();
}

// ======================= SERVICE EXPORT =======================
// Use NODE_ENV to reliably detect production. This is standard in Next.js.
const upload = (file: File, destinationPath: string): Promise<string> => {
  if (process.env.NODE_ENV === 'production') {
    return uploadToFirebase(file, destinationPath);
  }
  return uploadToLocalDisk(file, destinationPath);
};

export const storageService = {
  upload,
};
