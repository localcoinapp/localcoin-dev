
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "localcoin-marketplace",
  "appId": "1:929108967513:web:ddc99e36b6338aefc4b148",
  "storageBucket": "localcoin-marketplace.firebasestorage.app",
  "apiKey": "AIzaSyDuU4uvBrYnyI6f6wk4n4hSCltJuJIYitg",
  "authDomain": "localcoin-marketplace.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "929108967513"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
