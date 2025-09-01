'use server';

import { getAdminStorage } from '@/lib/firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';

// ======================= LOCAL STORAGE IMPLEMENTATION =======================
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function uploadToLocalDisk(file: File, relativePath: string): Promise<string> {
  const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
  await fs.mkdir(directory, { recursive: true });

  const filePath = path.join(directory, path.basename(relativePath));
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, fileBuffer);

  // Return a path that can be served by our local server endpoint
  return `/api/serve-uploads/${relativePath}`;
}

// ===================== FIREBASE STORAGE IMPLEMENTATION ======================
async function uploadToFirebase(file: File, destinationPath: string): Promise<string> {
  const storage = getAdminStorage();
  const bucket = storage.bucket();
  
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileInBucket = bucket.file(destinationPath);

  await fileInBucket.save(fileBuffer, {
    metadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
    },
  });

  // No need to make the file public if using signed URLs, but for simplicity
  // and public assets like avatars, making them public is common.
  await fileInBucket.makePublic();
  
  // Return the public URL
  return fileInBucket.publicUrl();
}

// ======================= SERVICE EXPORT =======================
// Determine which upload function to use based on the environment
const upload = (file: File, destinationPath: string): Promise<string> => {
  // NODE_ENV is set to 'production' by Next.js during a production build
  if (process.env.NODE_ENV === 'production') {
    return uploadToFirebase(file, destinationPath);
  }
  return uploadToLocalDisk(file, destinationPath);
};

export const storageService = {
  upload,
};
