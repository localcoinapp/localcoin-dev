
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, updateProfile } from 'firebase/auth';
import { getFirestore, getDoc } from 'firebase/firestore';

// ==================================================================
// == PASTE YOUR NEW FIREBASE CONFIGURATION OBJECT FROM STEP 1 HERE ==
// ==================================================================
const firebaseConfig = {
    "projectId": "YOUR_NEW_PROJECT_ID",
    "appId": "YOUR_NEW_APP_ID",
    "storageBucket": "YOUR_NEW_STORAGE_BUCKET",
    "apiKey": "YOUR_NEW_API_KEY",
    "authDomain": "YOUR_NEW_AUTH_DOMAIN",
    "messagingSenderId": "YOUR_NEW_MESSAGING_SENDER_ID"
};
// ==================================================================

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence to local. This is the crucial part for this environment.
setPersistence(auth, browserLocalPersistence);

export { app, auth, db, getDoc, updateProfile };
