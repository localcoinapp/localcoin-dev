
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, updateProfile } from 'firebase/auth';
import { initializeFirestore, getDoc } from 'firebase/firestore';

// ==================================================================
// == PASTE YOUR NEW FIREBASE CONFIGURATION OBJECT FROM STEP 1 HERE ==
// ==================================================================
const firebaseConfig = {
    "projectId": "localcoin-marketplace",
    "appId": "1:929108967513:web:ddc99e36b6338aefc4b148",
    "storageBucket": "localcoin-marketplace.appspot.com",
    "apiKey": "AIzaSyDuU4uvBrYnyI6f6wk4n4hSCltJuJIYitg",
    "authDomain": "localcoin-marketplace.firebaseapp.com",
    "messagingSenderId": "929108967513"
};
// ==================================================================

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// More robust Firestore initialization to avoid network issues
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});

const auth = getAuth(app);

// Set persistence to local. This is the crucial part for this environment.
setPersistence(auth, browserLocalPersistence);

export { app, auth, db, getDoc, updateProfile };
