'use server';

import * as admin from 'firebase-admin';

// This is the single source of truth for the Firebase Admin SDK instance.
let adminApp: admin.app.App;

/**
 * Initializes the Firebase Admin SDK, reusing the instance if it already exists.
 * This is the standard pattern for using the Admin SDK in a serverless environment.
 */
function initializeAdminApp(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }

  // When deployed to App Hosting, these env vars are automatically set.
  // When running locally, they must be in the .env file.
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!serviceAccount) {
    throw new Error(
      'CRITICAL: FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set.'
    );
  }
  if (!storageBucket) {
     throw new Error(
      'CRITICAL: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not set.'
    );
  }

  try {
    const credential = admin.credential.cert(JSON.parse(serviceAccount));
    
    adminApp = admin.initializeApp({
        credential,
        storageBucket,
    }, `admin-${Date.now()}`); // Use a unique app name to avoid conflicts

    return adminApp;
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
        // This can happen in some hot-reload scenarios. Return the existing default app.
        return admin.app();
    }
    throw error; // Re-throw other initialization errors
  }
}

// Export a function that ensures initialization and returns the app.
// Other server-side modules will use this to get the Admin instance.
export function getFirebaseAdminApp() {
    return adminApp || initializeAdminApp();
}
