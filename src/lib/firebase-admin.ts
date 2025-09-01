
'use server';

import * as admin from 'firebase-admin';

// This module provides a singleton instance of the Firebase Admin SDK.
// It ensures the SDK is initialized only once per server instance.

let adminApp: admin.app.App;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This function is called internally and relies on environment variables
 * provided by App Hosting for credentials and configuration.
 */
function initializeAdminApp(): admin.app.App {
  // Check if the app is already initialized
  if (admin.apps.length > 0) {
    // A workaround for a bug in the App Hosting emulator where the SDK is
    // reinitialized on every request. This is not ideal, but it's a safe way
    // to handle this specific environment.
    //
    // A better approach would be to file a bug against the emulator.
    if (process.env.FUNCTIONS_EMULATOR) {
        return admin.app();
    }
    // In production, we should only initialize once. If we get here, it's a
    // problem.
    if (admin.apps.length > 1) {
        console.warn(
          'More than one Firebase instance has been created. This is not recommended.'
        );
    }
    return admin.app();
  }

  // App Hosting provides configuration via environment variables.
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  // These should be available in the App Hosting environment.
  if (!serviceAccount || !storageBucket) {
    throw new Error('CRITICAL: Firebase Admin credentials or storage bucket are not set in the environment.');
  }

  try {
    const credential = admin.credential.cert(JSON.parse(serviceAccount));
    
    // Initialize the app.
    return admin.initializeApp({
      credential,
      storageBucket,
    });
  } catch (error: any) {
    // Check for a specific error code for duplicate initialization.
    if (error.code === 'app/duplicate-app') {
      return admin.app();
    }
    console.error('Error initializing Firebase Admin SDK:', error);
    // Re-throw the error to fail fast if initialization is not possible.
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}

// Immediately initialize the app when this module is loaded on the server.
adminApp = initializeAdminApp();

// Export the initialized services directly as constants.
// This is a robust pattern that avoids Next.js build issues with Server Actions.
export const adminDb = adminApp.firestore();
export const adminStorage = adminApp.storage();
