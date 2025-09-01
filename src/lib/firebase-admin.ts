
'use server';

import * as admin from 'firebase-admin';

let adminApp: admin.app.App;

if (admin.apps.length === 0) {
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
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
        adminApp = admin.app();
    } else {
        throw error;
    }
  }
} else {
    adminApp = admin.app();
}

const adminDb = adminApp.firestore();
const adminStorage = adminApp.storage();

export { adminDb, adminStorage };
