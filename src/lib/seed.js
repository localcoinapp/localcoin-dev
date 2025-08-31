
// This script has been intentionally disabled to prevent automatic data seeding.
// All user and merchant creation should be handled through the application's
// sign-up and administrative approval flows.
import { db } from './firebase.js'; // Keep import for potential future safe use
import { collection, setDoc, doc } from 'firebase/firestore';

export async function seedDatabase() {
  try {
    console.log('seedDatabase function was called, but seeding is permanently disabled. No data was added to the database.');
  } catch (error)
    console.error('An error occurred within the disabled seedDatabase function:', error);
    // Re-throwing the error is important if any caller expects a Promise rejection.
    throw error;
  }
}
