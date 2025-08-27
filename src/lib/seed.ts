
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
  try