
// lib/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  // Prevent re-initialization
  if (getApps().length) {
    return;
  }
  
  const serviceAccountEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  
  // 1. Explicitly check if the environment variable exists
  if (!serviceAccountEnv) {
    const errorMsg = 'CRITICAL: The FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. The server cannot authenticate with admin privileges.';
    console.error(errorMsg);
    // Throw an error to crash the server process on startup, making the problem obvious.
    throw new Error(errorMsg);
  }

  // 2. Try to parse the environment variable as JSON
  try {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully with Service Account from environment variable.');
  } catch (e) {
    const errorMsg = 'CRITICAL: Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT. Ensure it is a valid, single-line JSON string without extra quotes or characters.';
    console.error(errorMsg, e);
    // Also crash here so the problem is immediately visible in server logs.
    throw new Error(errorMsg);
  }
}

export function adminDB() {
  initAdmin();
  return getFirestore();
}
