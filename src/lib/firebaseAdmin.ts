// lib/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  // Prevent re-initialization in hot-reload environments
  if (getApps().length) {
    return;
  }
  
  const serviceAccountEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  
  if (!serviceAccountEnv) {
    const errorMsg = 'CRITICAL: The FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. The server cannot authenticate with admin privileges.';
    console.error(errorMsg);
    // Throw an error to crash the server process on startup, making the problem obvious.
    throw new Error(errorMsg);
  }

  try {
    // This is a more robust way to parse the JSON, which might be wrapped in quotes
    // or have other small inconsistencies from being in an .env file.
    const serviceAccountString = serviceAccountEnv.trim();
    const serviceAccount = JSON.parse(serviceAccountString);

    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully with Service Account from environment variable.');
  } catch (e: any) {
    const errorMsg = `CRITICAL: Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT. Ensure it is a valid, single-line JSON string. Error: ${e.message}`;
    console.error(errorMsg, e);
    // Crash the server so the problem is immediately visible in server logs.
    throw new Error(errorMsg);
  }
}

// This function will be called by API routes that need admin access.
// It ensures initialization is attempted only when needed.
export function adminDB() {
  initAdmin();
  return getFirestore();
}
