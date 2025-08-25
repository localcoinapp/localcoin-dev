
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
    console.log('Starting database seed...');

    // --- USER DATA ---
    // This section defines the users and updates their roles and merchant IDs as needed.
    const users = [
      {
        uid: 'some-unique-id-1',
        email: 'localcoinapp@gmail.com',
        role: 'admin',
      },
      {
        uid: 'some-unique-id-2',
        email: 'djwilros666@gmail.com',
        role: 'merchant',
        merchantId: 'merchant-berlin-wall-tours-002', // Link to the merchant
      },
      {
        uid: 'some-unique-id-3',
        email: 'katarifarms22@gmail.com',
        role: 'merchant',
        merchantId: 'merchant-katari-farms-001', // Link to the merchant
      },
      {
        uid: 'some-unique-id-4',
        email: 'jrooliefer@gmail.com',
        role: 'merchant',
        merchantId: 'merchant-some-club-003', // Link to the merchant
      }
    ];

    for (const user of users) {
        await setDocument('users', user.uid, user);
    }


    // --- MERCHANT DATA ---
    // This section recreates the three merchants with correct ownership and data structure.
    const merchantsToSeed = [
        {
            id: 'merchant-katari-farms-001',
            owner: 'some-unique-id-3', // katarifarms22@gmail.com
            userEmail: 'katarifarms22@gmail.com',
            companyName: 'Katari Farms',
            category: 'Farm',
            position: { lat: 52.5020, lng: 13.4115 },
            description: 'Your local source for fresh, organic produce right from the heart of the city.',
            rating: 4.8,
            status: 'live',
        },
        {
            id: 'merchant-berlin-wall-tours-002',
            owner: 'some-unique-id-2', // djwilros666@gmail.com
            userEmail: 'djwilros666@gmail.com',
            companyName: 'Berlin Wall Tours',
            category: 'Activities',
            position: { lat: 52.5163, lng: 13.3777 },
            description: 'Explore the history of the Berlin Wall with our expert guides.',
            rating: 4.9,
            status: 'live',
        },
        {
            id: 'merchant-some-club-003',
            owner: 'some-unique-id-4', // jrooliefer@gmail.com
            userEmail: 'jrooliefer@gmail.com',
            companyName: 'SomeClub',
            category: 'Events',
            position: { lat: 52.4866, lng: 13.4389 },
            description: 'The best underground beats in Berlin. Join us for a night of electronic music.',
            rating: 4.5,
            status: 'live',
        }
    ];

    for (const merchant of merchantsToSeed) {
        const userDocRef = doc(db, 'users', merchant.owner);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        // Use the specified ID for the merchant document
        await setDocument('merchants', merchant.id, {
            ...merchant,
            walletAddress: userData?.walletAddress || '', // Use existing wallet info if available
            geohash: geohashForLocation([merchant.position.lat, merchant.position.lng]),
            logo: `/merchants/${merchant.id}/logo.png`, // Placeholder path using merchant ID
            banner: `/merchants/${merchant.id}/banner.jpg`, // Placeholder path using merchant ID
            listings: [],
            pendingOrders: [],
            recentTransactions: [],
            submittedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
        });
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database: ', error);
    throw error;
  }
}
