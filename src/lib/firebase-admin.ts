'use server';

import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

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
    if (error.code === 'app/duplicate-app') {
      return admin.app();
    }
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}

function getAdminApp(): admin.app.App {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }
  return adminApp;
}

export function getAdminDb() {
  return getAdminApp().firestore();
}

export function getAdminStorage() {
  return getAdminApp().storage();
}
