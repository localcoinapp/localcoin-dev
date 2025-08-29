
import * as admin from 'firebase-admin';

// This is a singleton pattern to prevent re-initializing the app on every hot-reload.
let app: admin.app.App;

if (!admin.apps.length) {
  const serviceAccountString = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set.');
  }

  const serviceAccount = JSON.parse(serviceAccountString);
  
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com`
  });
} else {
  app = admin.app();
}

const storage = admin.storage();
export { app as adminApp, storage as adminStorage };
