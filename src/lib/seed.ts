
import { db } from './firebase';
import { collection, setDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';

// Helper function to create a Firestore document with a specific ID
async function setDocument(collectionName: string, docId: string, data: any) {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true }); // Use merge to avoid overwriting existing fields unintentionally
    console.log(`Document ${docId} in ${collectionName} created/updated.`);
}


export async function seedDatabase() {
  try {
    console.log('Starting database seed...');

    // --- USERS ---
    // Note: We use specific UIDs to create a predictable relationship between users and merchants.
    const users = [
      {
        uid: 'user-admin-001',
        email: 'localcoinapp@gmail.com',
        role: 'admin',
        name: 'Admin User',
        profileComplete: true,
      },
      {
        uid: 'user-merchant-003',
        email: 'katarifarms22@gmail.com',
        role: 'merchant',
        name: 'Katari Farms Owner',
        merchantId: 'merchant-katari-farms-001',
        profileComplete: true,
      },
      {
        uid: 'user-merchant-002',
        email: 'djwilros666@gmail.com',
        role: 'merchant',
        name: 'DJ Wilros',
        merchantId: 'merchant-berlin-wall-tours-002',
        profileComplete: true,
      },
      {
        uid: 'user-merchant-004',
        email: 'jrooliefer@gmail.com',
        role: 'merchant',
        name: 'J. Rooliefer',
        merchantId: 'merchant-some-club-003',
        profileComplete: true,
      },
    ];

    for (const user of users) {
      await setDocument('users', user.uid, {
        ...user,
        walletBalance: user.walletBalance || 0,
      });
    }

    // --- MERCHANTS ---
    
    // Merchant 1: Katari Farms
    const katariFarmsId = 'merchant-katari-farms-001';
    const katariFarmsPosition = { lat: 52.5020, lng: 13.4115 }; // Example location: Near Kreuzberg, Berlin
    await setDocument('merchants', katariFarmsId, {
        id: katariFarmsId,
        owner: 'user-merchant-003', // UID of katarifarms22@gmail.com
        userEmail: 'katarifarms22@gmail.com',
        companyName: 'Katari Farms',
        category: 'Farm',
        status: 'live',
        description: 'Your local source for fresh, organic produce right from the heart of the city. We believe in sustainable farming and community building.',
        position: katariFarmsPosition,
        geohash: geohashForLocation([katariFarmsPosition.lat, katariFarmsPosition.lng]),
        rating: 4.8,
        logo: `/merchants/${katariFarmsId}/logo.png`, // Assuming a path based on ID
        banner: `/merchants/${katariFarmsId}/banner.jpg`,
        listings: [],
        submittedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
    });

    // Merchant 2: Berlin Wall Tours
    const berlinWallToursId = 'merchant-berlin-wall-tours-002';
    const berlinWallToursPosition = { lat: 52.5163, lng: 13.3777 }; // Example location: Near Brandenburg Gate
    await setDocument('merchants', berlinWallToursId, {
        id: berlinWallToursId,
        owner: 'user-merchant-002', // UID of djwilros666@gmail.com
        userEmail: 'djwilros666@gmail.com',
        companyName: 'Berlin Wall Tours',
        category: 'Activities',
        status: 'live',
        description: 'Explore the history of the Berlin Wall with our expert guides. We offer walking tours that bring the stories of this historic landmark to life.',
        position: berlinWallToursPosition,
        geohash: geohashForLocation([berlinWallToursPosition.lat, berlinWallToursPosition.lng]),
        rating: 4.9,
        logo: `/merchants/${berlinWallToursId}/logo.png`,
        banner: `/merchants/${berlinWallToursId}/banner.jpg`,
        listings: [],
        submittedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
    });
    
    // Merchant 3: SomeClub
    const someClubId = 'merchant-some-club-003';
    const someClubPosition = { lat: 52.4866, lng: 13.4389 }; // Example location: Near Treptower Park
    await setDocument('merchants', someClubId, {
        id: someClubId,
        owner: 'user-merchant-004', // UID of jrooliefer@gmail.com
        userEmail: 'jrooliefer@gmail.com',
        companyName: 'SomeClub',
        category: 'Events',
        status: 'live',
        description: 'The best underground beats in Berlin. Join us for a night of electronic music and unforgettable vibes. Open late every weekend.',
        position: someClubPosition,
        geohash: geohashForLocation([someClubPosition.lat, someClubPosition.lng]),
        rating: 4.5,
        logo: `/merchants/${someClubId}/logo.png`,
        banner: `/merchants/${someClubId}/banner.jpg`,
        listings: [],
        submittedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
    });

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database: ', error);
    throw error;
  }
}
