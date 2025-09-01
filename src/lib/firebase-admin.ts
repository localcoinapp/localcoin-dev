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
  // Check if the app is already initialized to prevent re-initialization.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // In a server-side environment like App Hosting, environment variables will be available at runtime.
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  // The build process might not have these variables, but the runtime will.
  // This check is primarily for runtime validation.
  if (!serviceAccount || !storageBucket) {
    throw new Error('CRITICAL: Firebase Admin credentials or storage bucket are not set in the environment.');
  }

  try {
    const credential = admin.credential.cert(JSON.parse(serviceAccount));
    
    // Initialize the app with the retrieved credentials.
    return admin.initializeApp({
      credential,
      storageBucket,
    });
  } catch (error: any) {
    // A specific check for race conditions or redundant initializations.
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
 * This is the key function that prevents build crashes.
 * It ensures initialization only happens when the services are first accessed at runtime.
 */
function getAdminApp() {
    if (!adminApp) {
        adminApp = initializeAdminApp();
    }
    return adminApp;
}

// Export lazy-loaded services.
// Other modules will import these, and the app will be initialized on first use.
export const adminDb = getAdminApp().firestore();
export const adminStorage = getAdminApp().storage();
