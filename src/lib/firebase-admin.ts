
'use server';

import * as admin from 'firebase-admin';

// This module provides a singleton instance of the Firebase Admin SDK.
// It ensures the SDK is initialized only once per server instance.

let adminApp: admin.app.App;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This function is designed to be safe for both build-time and run-time environments.
 * It checks for existing initializations and uses environment variables for credentials.
 */
function initializeAdminApp(): admin.app.App {
  // Check if the app is already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // In a server-side environment (like an API route at runtime),
  // environment variables will be available.
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!serviceAccount || !storageBucket) {
    // This check will fail during the build process (`next build`), which is expected.
    // The lazy-loading approach in getAdminApp() ensures this doesn't crash the build.
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
    // A specific check for re-initialization race conditions.
    if (error.code === 'app/duplicate-app') {
      return admin.app();
    }
    console.error('Error initializing Firebase Admin SDK:', error);
    // Re-throw to fail fast if initialization is genuinely impossible at runtime.
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}

/**
 * Lazily gets the initialized Firebase Admin App instance.
 * This is the key function that prevents the build process from crashing.
 * It ensures initialization only happens when the services are first accessed at runtime.
 */
function getAdminApp() {
    if (!adminApp) {
        adminApp = initializeAdminApp();
    }
    return adminApp;
}

// Export lazy-loaded services.
// Other modules will import these constants.
export const adminDb = getAdminApp().firestore();
export const adminStorage = getAdminApp().storage();
