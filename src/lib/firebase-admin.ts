
import * as admin from 'firebase-admin';

// This function ensures Firebase Admin is initialized only once (singleton pattern).
function initializeAdminApp() {
  // If already initialized, return the existing app.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Check for the required service account credentials from environment variables.
  const serviceAccountString = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    throw new Error('CRITICAL: FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set.');
  }

  // Check for the storage bucket URL from environment variables.
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new Error('CRITICAL: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not available to the server. Check apphosting.yaml.');
  }

  try {
    // Parse the JSON string into an object.
    const serviceAccount = JSON.parse(serviceAccountString);
    
    // Initialize the app with the parsed credentials and the direct storageBucket URL.
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucket,
    });
  } catch (error) {
    console.error('Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT. Make sure it is a valid JSON string.', error);
    throw new Error('Firebase Admin initialization failed due to invalid credentials.');
  }
}

// Export functions that provide initialized services.
// This "lazy-loading" pattern ensures initialization only happens when a service is first needed.
export function getAdminStorage() {
  initializeAdminApp();
  return admin.storage();
}

export function getAdminFirestore() {
  initializeAdminApp();
  return admin.firestore();
}
