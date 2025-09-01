
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { adminStorage } from '@/lib/firebase-admin'; // Use the initialized adminStorage directly

// ======================= LOCAL STORAGE IMPLEMENTATION =======================
// This is for local development only, where `npm run dev` is used.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function uploadToLocalDisk(file: File, relativePath: string): Promise<string> {
  const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
  await fs.mkdir(directory, { recursive: true });

  const filePath = path.join(directory, path.basename(relativePath));
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, fileBuffer);

  // Return a path that can be served by the local server endpoint
  return `/api/serve-uploads/${relativePath}`;
}

// ===================== FIREBASE STORAGE IMPLEMENTATION ======================
// This is for the published production environment.
async function uploadToFirebase(file: File, destinationPath: string): Promise<string> {
  const bucket = adminStorage.bucket();
  
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileInBucket = bucket.file(destinationPath);

  await fileInBucket.save(fileBuffer, {
    metadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
    },
  });

  await fileInBucket.makePublic();
  
  // Return the public URL
  return fileInBucket.publicUrl();
}

// ======================= SERVICE EXPORT =======================
// Determine which upload function to use based on the standard NODE_ENV variable.
const upload = (file: File, destinationPath: string): Promise<string> => {
  if (process.env.NODE_ENV === 'production') {
    return uploadToFirebase(file, destinationPath);
  }
  return uploadToLocalDisk(file, destinationPath);
};

export const storageService = {
  upload,
};
