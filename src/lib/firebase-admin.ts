
import * as admin from 'firebase-admin';

// This function ensures Firebase Admin is initialized only once (singleton pattern)
// and only when it's actually needed, avoiding build-time errors.
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountString = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    throw new Error('CRITICAL: FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set.');
  }

  // This is the variable made available by apphosting.yaml
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new Error('CRITICAL: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not available to the server. Check apphosting.yaml.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    
    // Correctly initialize with the parsed credentials and the direct storageBucket URL.
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucket,
    });
  } catch (error) {
    console.error('Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT. Make sure it is a valid JSON string.', error);
    throw new Error('Firebase Admin initialization failed due to invalid credentials.');
  }
}

// Export a function that provides the storage instance.
// This function will ensure the app is initialized before returning the storage client.
export function getAdminStorage() {
  initializeAdminApp();
  return admin.storage();
}
