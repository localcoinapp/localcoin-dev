import * as admin from 'firebase-admin';

const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set.');
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
    });
    console.log('Firebase Admin SDK Initialized.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error);
    // In a real production app, you might want to handle this more gracefully
    // For now, we'll log the error and let the app crash if it's a critical startup issue.
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
