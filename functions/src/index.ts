
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

admin.initializeApp();

const corsHandler = cors({
    origin: [
      "https://studio--localcoin-marketplace.us-central1.hosted.app",
      "https://9000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev",
      "https://6000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev",
      "https://3000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev",
      "http://localhost:3000",
      "http://localhost:9002",
      "https://dev.localcoin.cloud",
      "https://app.localcoin.cloud",
      "https://app.discoverberlin.live",
      "https://app.discovercuba.live",
      "https://app.discoverbolivia.live",
      "https://app.discoverflorida.live"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

export const checkBlocked = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated before checking their status.
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
