
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, updateProfile } from 'firebase/auth';
import { getFirestore, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

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
// We are not using Firebase storage for this implementation
// const storage = getStorage(app);

// Set persistence to local. This is the crucial part for this environment.
setPersistence(auth, browserLocalPersistence);

export { app, auth, db, getDoc, updateProfile };
