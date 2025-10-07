
// lib/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length) return;
  
  const svcJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  
  if (svcJson) {
    try {
      const serviceAccount = JSON.parse(svcJson);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('Firebase Admin SDK initialized with Service Account from environment variable.');
    } catch (e) {
      console.error('CRITICAL: Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT. Ensure it is a valid JSON string.', e);
      throw new Error('Server configuration error: Could not initialize Firebase Admin SDK.');
    }
  } else {
    // In environments like local emulator or Google Cloud with Application Default Credentials
    // This will try to find credentials automatically. If it fails, it will throw.
    try {
        initializeApp({ credential: applicationDefault() });
        console.log('Firebase Admin SDK initialized with Application Default Credentials.');
    } catch(e) {
        console.error('CRITICAL: FIREBASE_ADMIN_SERVICE_ACCOUNT is not set, and Application Default Credentials could not be found.', e);
        throw new Error('Server configuration error: Firebase Admin credentials are not configured.');
    }
  }
}

export function adminDB() {
  initAdmin();
  return getFirestore();
}
