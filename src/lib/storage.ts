
import { promises as fs } from 'fs';
import path from 'path';
import { getAdminStorage } from './firebase-admin'; // Server-side Firebase

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
  // Lazily get the storage instance only when this function is called.
  const bucket = getAdminStorage().bucket();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileInBucket = bucket.file(destinationPath);

  await fileInBucket.save(fileBuffer, {
    metadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
    },
  });

  // Make the file public and return its URL.
  // Note: Your bucket needs to have "allUsers" permission to "Storage Object Viewer" in IAM.
  await fileInBucket.makePublic();
  return fileInBucket.publicUrl();
}

// ======================= SERVICE EXPORT =======================
// This is the core fix. The decision logic is now inside the exported function,
// ensuring the check for STORAGE_PROVIDER happens at RUNTIME, not build time.

const upload = (file: File, destinationPath: string): Promise<string> => {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  
  if (provider === 'firebase') {
    console.log(`Using 'firebase' storage provider for: ${destinationPath}`);
    return uploadToFirebase(file, destinationPath);
  }
  
  console.log(`Using 'local' storage provider for: ${destinationPath}`);
  return uploadToLocalDisk(file, destinationPath);
};


export const storageService = {
  upload,
};
