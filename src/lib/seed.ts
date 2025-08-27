
import { db } from './firebase';
import { collection, setDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import * as bip39 from "bip39";
import { Keypair } from "@solana/web3.js";

// Helper function to create a Firestore document with a specific ID
async function setDocument(collectionName: string, docId: string, data: any) {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
    console.log(`Document ${docId} in ${collectionName} created/updated.`);
}


export async function seedDatabase() {
  try {
    console.log('Seeding database...');
    // Add any seed logic here in the future
    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error; // Re-throw the error to fail the script if seeding fails
  }
}
