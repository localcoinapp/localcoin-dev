
'use server';

import { adminStorage } from '@/lib/firebase-admin';
import {promises as fs} from 'fs';
import path from 'path';

// ======================= LOCAL STORAGE IMPLEMENTATION =======================
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function uploadToLocalDisk(file: File, relativePath: string): Promise<string> {
  const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
  await fs.mkdir(directory, { recursive: true });

  const filePath = path.join(directory, path.basename(relativePath));
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, fileBuffer);

  return `/api/serve-uploads/${relativePath}`;
}

// ===================== FIREBASE STORAGE IMPLEMENTATION ======================
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
  return fileInBucket.publicUrl();
}

// ======================= SERVICE EXPORT =======================
const upload = (file: File, destinationPath: string): Promise<string> => {
  if (process.env.NODE_ENV === 'production') {
    return uploadToFirebase(file, destinationPath);
  }
  return uploadToLocalDisk(file, destinationPath);
};

export const storageService = {
  upload,
};
