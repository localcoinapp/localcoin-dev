
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
    // Stable UIDs are used to ensure predictable relationships between users and merchants.
    const users = [
      {
        uid: 'user-admin-001',
        email: 'localcoinapp@gmail.com',
        role: 'admin',
        name: 'Admin User',
        profileComplete: true,
        walletBalance: 0,
      },
      {
        uid: 'user-katarifarms-003',
        email: 'katarifarms22@gmail.com',
        role: 'merchant',
        name: 'Katari Farms Owner',
        merchantId: 'merchant-katari-farms-001',
        profileComplete: true,
      },
      {
        uid: 'user-djwilros-002',
        email: 'djwilros666@gmail.com',
        role: 'merchant',
        name: 'DJ Wilros',
        merchantId: 'merchant-berlin-wall-tours-002',
        profileComplete: true,
      },
      {
        uid: 'user-jrooliefer-004',
        email: 'jrooliefer@gmail.com',
        role: 'merchant',
        name: 'J. Rooliefer',
        merchantId: 'merchant-some-club-003',
        profileComplete: true,
      },
    ];

    for (const user of users) {
        const mnemonic = bip39.generateMnemonic();
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const keypair = Keypair.fromSeed(seed.slice(0, 32));
        const walletAddress = keypair.publicKey.toBase58();

        await setDocument('users', user.uid, {
            ...user,
            ...(user.role === 'merchant' && {
              walletAddress: walletAddress,
              seedPhrase: mnemonic, // NOTE: In a real app, this should be encrypted.
            }),
            walletBalance: 0,
        });
    }


    // --- MERCHANT DATA ---
    const merchants = [
        {
            id: 'merchant-katari-farms-001',
            owner: 'user-katarifarms-003',
            userEmail: 'katarifarms22@gmail.com',
            companyName: 'Katari Farms',
            category: 'Farm',
            position: { lat: 52.5020, lng: 13.4115 },
            description: 'Your local source for fresh, organic produce right from the heart of the city.',
            rating: 4.8,
        },
        {
            id: 'merchant-berlin-wall-tours-002',
            owner: 'user-djwilros-002',
            userEmail: 'djwilros666@gmail.com',
            companyName: 'Berlin Wall Tours',
            category: 'Activities',
            position: { lat: 52.5163, lng: 13.3777 },
            description: 'Explore the history of the Berlin Wall with our expert guides.',
            rating: 4.9,
        },
        {
            id: 'merchant-some-club-003',
            owner: 'user-jrooliefer-004',
            userEmail: 'jrooliefer@gmail.com',
            companyName: 'SomeClub',
            category: 'Events',
            position: { lat: 52.4866, lng: 13.4389 },
            description: 'The best underground beats in Berlin. Join us for a night of electronic music.',
            rating: 4.5,
        }
    ];

    for (const merchant of merchants) {
        const userDocRef = doc(db, 'users', merchant.owner);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.data();

        await setDocument('merchants', merchant.id, {
            ...merchant,
            walletAddress: userData?.walletAddress || '',
            geohash: geohashForLocation([merchant.position.lat, merchant.position.lng]),
            status: 'live',
            logo: `/merchants/${merchant.id}/logo.png`,
            banner: `/merchants/${merchant.id}/banner.jpg`,
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
