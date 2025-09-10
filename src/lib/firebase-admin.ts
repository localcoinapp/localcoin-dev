// lib/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This is the correct way to initialize the admin SDK in this environment.
// It ensures that the service account from the environment variable is parsed and used.
if (!getApps().length) {
  const serviceAccountEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    try {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT:', e);
      // Fallback to default credentials if parsing fails
      initializeApp({
        credential: applicationDefault(),
      });
    }
  } else {
    // Use default credentials if the env var is not set (e.g., in local emulator)
    initializeApp({
      credential: applicationDefault(),
    });
  }
}

export const firestore = getFirestore();
