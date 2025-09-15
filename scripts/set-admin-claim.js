
// This is a one-time use script to set a custom admin claim on your Firebase user account.
// It uses the Firebase Admin SDK and requires your environment to be authenticated.
// HOW TO RUN:
// 1. Make sure you have the Firebase Admin SDK installed: npm install firebase-admin
// 2. Make sure your environment is authenticated to your project (e.g., `gcloud auth application-default login`)
// 3. Replace '<YOUR_ADMIN_UID_HERE>' with your actual Firebase User ID.
// 4. Run the script from your project root: `node scripts/set-admin-claim.js`

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const USER_ID = 'Wmn0LfuyA9PHymwgdk37Zi2jhEy2'; // <--- IMPORTANT: REPLACE THIS

// --- SDK Initialization ---
// The script will attempt to use the service account JSON from your environment variables.
// Ensure FIREBASE_ADMIN_SERVICE_ACCOUNT is set in your local .env file or your terminal session.
function initializeAdmin() {
  const serviceAccountEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountEnv) {
    throw new Error('CRITICAL: FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. Cannot initialize Admin SDK.');
  }
  try {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('Admin SDK initialized successfully.');
  } catch (e) {
    console.error('Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT. Make sure it is a valid JSON string.', e);
    process.exit(1);
  }
}

async function setAdminClaim(uid) {
  if (!uid || uid.startsWith('<')) {
    console.error('ERROR: Please replace "<YOUR_ADMIN_UID_HERE>" with a valid Firebase user ID in the script.');
    return;
  }

  try {
    await getAuth().setCustomUserClaims(uid, { admin: true });
    console.log(`Success! Custom claim 'admin: true' set for user: ${uid}`);
    console.log('You may need to log out and log back in for the changes to take effect.');
  } catch (error) {
    console.error('Error setting custom claim:', error);
  }
}

async function main() {
    try {
        initializeAdmin();
        await setAdminClaim(USER_ID);
        process.exit(0);
    } catch(error) {
        console.error("Script failed:", error);
        process.exit(1);
    }
}

main();
