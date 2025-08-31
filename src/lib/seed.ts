
import { db } from './firebase';
import { collection, setDoc, doc, Timestamp, getDoc } from 'firebase/firestore';

export async function seedDatabase() {
  try {
    // All seeding logic has been removed from this function as per user request.
    // This function is now empty and will not perform any database operations.
    // Users and merchants should be created exclusively through the application's UI.
    console.log('seedDatabase function called, but seeding is disabled.');
  } catch (error) {
    console.error('An error occurred in the disabled seedDatabase function:', error);
    throw error;
  }
}
