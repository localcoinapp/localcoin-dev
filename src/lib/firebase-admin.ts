
'use server';

import * as admin from 'firebase-admin';

// This module provides a singleton instance of the Firebase Admin SDK.
// It ensures the SDK is initialized only once across the server.

let adminApp: admin.app.App;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This function is designed to be safe to call multiple times.
 */
function initializeAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!serviceAccount || !storageBucket) {
    console.error('CRITICAL: Firebase Admin credentials or storage bucket are not set in the environment.');
    throw new Error('Server is not configured for Firebase Admin operations.');
  }

  try {
    const credential = admin.credential.cert(JSON.parse(serviceAccount));
    return admin.initializeApp({
      credential,
      storageBucket,
    });
  } catch (error: any) {
    // A race condition can still occur in some serverless environments,
    // so we check for the duplicate app error again.
    if (error.code === 'app/duplicate-app') {
      return admin.app();
    }
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}

// Initialize the app when the module is first loaded.
// The logic inside initializeAdminApp prevents re-initialization.
adminApp = initializeAdminApp();

// Export the initialized services directly.
export const adminDb = adminApp.firestore();
export const adminStorage = adminApp.storage();
