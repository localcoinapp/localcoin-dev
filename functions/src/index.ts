import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Callable function that returns { blocked: boolean }
// Uses context.auth.uid if available. Auth required.
export const checkBlocked = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const uid = context.auth.uid;

  try {
    const docRef = admin.firestore().doc(`blocked_users/${uid}`);
    const snap = await docRef.get();
    const blocked = snap.exists && !!snap.data();
    return { blocked: !!blocked };
  } catch (err: any) {
    console.error('checkBlocked failed:', err);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to check blocked status'
    );
  }
});
