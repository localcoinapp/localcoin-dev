// This is a one-time use script to set a custom admin claim on your Firebase user account.
// It uses the Firebase Admin SDK and requires your environment to be authenticated.
// HOW TO RUN:
// 1. Make sure your environment is authenticated: `gcloud auth application-default login`
// 2. Make sure the USER_ID below is correct.
// 3. Run the script from your project root: `node scripts/set-admin-claim.js`

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const USER_ID = 'Wmn0LfuyA9PHymwgdk37Zi2jhEy2';

async function main() {
  if (!USER_ID || USER_ID.startsWith('<')) {
    console.error('ERROR: Please replace "<YOUR_ADMIN_UID_HERE>" with a valid Firebase user ID in the script.');
    process.exit(1);
  }
  
  try {
    // Initialize the Admin SDK. It will automatically find the credentials
    // set by `gcloud auth application-default login`.
    initializeApp({
      credential: applicationDefault(),
    });
    console.log('Admin SDK initialized successfully.');

    await getAuth().setCustomUserClaims(USER_ID, { admin: true });
    console.log(`✅ Success! Custom claim 'admin: true' set for user: ${USER_ID}`);
    console.log('You may need to log out and log back in for the changes to take effect on the client.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting custom claim:', error);
    console.error('\nPlease ensure you have run "gcloud auth application-default login" and that the project is correct.');
    process.exit(1);
  }
}

main();
