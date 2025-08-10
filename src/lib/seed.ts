
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
    ];

    for (const user of users) {
      await setDoc(doc(db, 'users', user.uid), user);
      console.log(`User ${user.email} seeded`);
    }

    // Seed merchants
    const merchantPosition = { lat: 52.517, lng: 13.453 };
    const merchant = {
      companyName: 'Katari Farms',
      owner: 'user-merchant-003', // Corresponds to katarifarms22@gmail.com
      listings: [],
      position: merchantPosition,
      geohash: geohashForLocation([merchantPosition.lat, merchantPosition.lng]),
      street: "Kietzer Weg",
      houseNumber: "10",
      city: "Berlin",
      zipCode: "10365",
      logo: '/merchants/katari-farms-logo.png',
      banner: '/merchants/katari-farms-banner.jpg',
      category: 'Farm',
      description: 'Fresh organic produce, straight from our fields to your table. We believe in sustainable agriculture and happy chickens.',
      rating: 4.8,
      aiHint: "organic farm market",
    };

    const docRef = await addDoc(collection(db, 'merchants'), merchant);
    await setDoc(doc(db, 'users', 'user-merchant-003'), { merchantId: docRef.id }, { merge: true });

    console.log('Merchant seeded with ID: ', docRef.id);
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database: ', error);
    throw error;
  }
}

    