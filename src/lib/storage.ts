
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { adminStorage } from '@/lib/firebase-admin'; // Use the initialized adminStorage directly

// ======================= LOCAL STORAGE IMPLEMENTATION =======================
// For local development (`npm run dev`), files are stored on disk.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function uploadToLocalDisk(file: File, relativePath: string): Promise<string> {
  const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
  await fs.mkdir(directory, { recursive: true });

  const filePath = path.join(directory, path.basename(relativePath));
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, fileBuffer);

  // Return a path that the local server can use to serve the file.
  return `/api/serve-uploads/${relativePath}`;
}

// ===================== FIREBASE STORAGE IMPLEMENTATION ======================
// For the production environment, files are uploaded to Firebase Cloud Storage.
async function uploadToFirebase(file: File, destinationPath: string): Promise<string> {
  const bucket = adminStorage.bucket();
  
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileInBucket = bucket.file(destinationPath);

  await fileInBucket.save(fileBuffer, {
    metadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
    },
  });

  await fileInBucket.makePublic();
  
  // Return the public URL for the uploaded file.
  return fileInBucket.publicUrl();
}

// ======================= SERVICE EXPORT =======================
// The service object determines which upload function to use based on the
// standard NODE_ENV variable. This is reliable in Next.js environments.
const upload = (file: File, destinationPath: string): Promise<string> => {
  if (process.env.NODE_ENV === 'production') {
    return uploadToFirebase(file, destinationPath);
  }
  return uploadToLocalDisk(file, destinationPath);
};

export const storageService = {
  upload,
};
