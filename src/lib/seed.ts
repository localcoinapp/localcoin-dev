
import { db } from './firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';

export async function seedDatabase() {
  try {
    // Seed users
    const users = [
      {
        uid: 'user-admin-001',
        email: 'localcoinapp@gmail.com',
        role: 'admin',
        walletBalance: 0,
      },
      {
        uid: 'user-standard-002',
        email: 'djwilros666@gmail.com',
        role: 'user',
        walletBalance: 0,
      },
      {
        uid: 'user-merchant-003',
        email: 'katarifarms22@gmail.com',
        role: 'merchant',
        walletBalance: 0,
        name: 'Katari Farms Owner',
      },
       {
        uid: 'user-merchant-004',
        email: 'sunnycafe@example.com',
        role: 'merchant',
        walletBalance: 0,
        name: 'Sunny Cafe Owner',
      },
      {
        uid: 'user-merchant-005',
        email: 'urbanhotel@example.com',
        role: 'merchant',
        walletBalance: 0,
        name: 'Urban Hotel Owner',
      },
    ];

    for (const user of users) {
      await setDoc(doc(db, 'users', user.uid), user);
      console.log(`User ${user.email} seeded`);
    }

    const merchantsToSeed = [
       {
        companyName: 'Katari Farms',
        owner: 'user-merchant-003',
        position: { lat: 52.517, lng: 13.453 },
        logo: '/merchants/katari-farms-logo.png',
        banner: '/merchants/katari-farms-banner.jpg',
        category: 'Farm',
        description: 'Fresh organic produce, straight from our fields to your table. We believe in sustainable agriculture and happy chickens.',
        rating: 4.8,
        aiHint: "organic farm market",
        status: 'live',
      },
      {
        companyName: 'The Sunny Side',
        owner: 'user-merchant-004',
        position: { lat: 52.520, lng: 13.405 },
        logo: '/merchants/sunny-side-logo.png',
        banner: '/merchants/sunny-side-banner.jpg',
        category: 'Cafe',
        description: 'The best artisanal coffee and brunch in the heart of the city. We serve specialty coffee and delicious homemade cakes.',
        rating: 4.9,
        aiHint: "modern cafe interior",
        status: 'live',
      },
      {
        companyName: 'Urban Hotel & Stay',
        owner: 'user-merchant-005',
        position: { lat: 52.51, lng: 13.38 },
        logo: '/merchants/urban-hotel-logo.png',
        banner: '/merchants/urban-hotel-banner.jpg',
        category: 'Hotel',
        description: 'A stylish and comfortable stay for the modern traveler. Enjoy our rooftop bar and city views.',
        rating: 4.6,
        aiHint: "luxury hotel lobby",
        status: 'live',
      }
    ];

    for (const merchantData of merchantsToSeed) {
        const merchantWithGeo = {
            ...merchantData,
            geohash: geohashForLocation([merchantData.position.lat, merchantData.position.lng]),
            listings: [],
            createdAt: new Date(),
            submittedAt: new Date(),
        };
        const docRef = await addDoc(collection(db, 'merchants'), merchantWithGeo);
        await setDoc(doc(db, 'users', merchantData.owner), { merchantId: docRef.id }, { merge: true });
        console.log(`Merchant ${merchantData.companyName} seeded with ID: `, docRef.id);
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database: ', error);
    throw error;
  }
}
