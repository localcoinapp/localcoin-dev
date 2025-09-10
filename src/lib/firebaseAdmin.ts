// lib/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length) return;
  // Prefer ADC in App Hosting; or use a service account JSON if you store it in a secret
  const svcJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (svcJson) {
    initializeApp({ credential: cert(JSON.parse(svcJson)) });
  } else {
    initializeApp({ credential: applicationDefault() });
  }
}

export function adminDB() {
  initAdmin();
  return getFirestore();
}
