
'use server';

import * as admin from 'firebase-admin';

// This module provides a singleton instance of the Firebase Admin SDK.
// It ensures the SDK is initialized only once per server instance.

let adminApp: admin.app.App;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This function is called internally and relies on environment variables
 * for credentials and configuration. It is designed to be safe for both
 * build-time and run-time environments in Next.js.
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
    // We throw an error to prevent initialization during build, but the lazy-loading
    // approach ensures this function is only truly executed at runtime.
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
