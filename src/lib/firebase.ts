
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, getDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
    "projectId": "localcoin-marketplace",
    "appId": "1:929108967513:web:ddc99e36b6338aefc4b148",
    "storageBucket": "localcoin-marketplace.appspot.com",
    "apiKey": "AIzaSyDuU4uvBrYnyI6f6wk4n4hSCltJuJIYitg",
    "authDomain": "localcoin-marketplace.firebaseapp.com",
    "messagingSenderId": "929108967513"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence to local. This is the crucial part for this environment.
setPersistence(auth, browserLocalPersistence);

export { app, auth, db, getDoc };
