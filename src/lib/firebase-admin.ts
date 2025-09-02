// src/lib/firebase-admin.ts
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const RAW_SERVICE_ACCOUNT = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

// Prefer server-only var; fall back to NEXT_PUBLIC to be forgiving, then sanitize.
const RAW_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  '';

/** Convert possible "gs://bucket" to "bucket" and trim spaces */
const BUCKET = RAW_BUCKET.replace(/^gs:\/\//, '').trim();

if (!getApps().length) {
  initializeApp({
    credential: RAW_SERVICE_ACCOUNT
      ? cert(JSON.parse(RAW_SERVICE_ACCOUNT))
      : applicationDefault(),
    // If BUCKET is empty, omit; otherwise Admin SDK can't infer a default.
    ...(BUCKET ? { storageBucket: BUCKET } : {}),
  });
}

export const firestore = getFirestore();
export const storage = getStorage();

/** Prefer using the explicit bucket name to avoid ambiguity */
export const bucket = BUCKET ? storage.bucket(BUCKET) : storage.bucket();
