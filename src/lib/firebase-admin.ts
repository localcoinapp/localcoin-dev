// lib/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const RAW_SERVICE_ACCOUNT = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

if (!getApps().length) {
  initializeApp({
    credential: RAW_SERVICE_ACCOUNT
      ? cert(JSON.parse(RAW_SERVICE_ACCOUNT))
      : applicationDefault(),
  });
}

export const firestore = getFirestore();
