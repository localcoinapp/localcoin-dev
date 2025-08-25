
import { db } from './firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';

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
        uid: 'user-standard-004',
        email: 'jrooliefer@gmail.com',
        role: 'user',
        walletBalance: 0,
        name: 'jrooliefer',
      },
    ];

    for (const user of users) {
      await setDoc(doc(db, 'users', user.uid), user);
      console.log(`User ${user.email} seeded`);
    }
    
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database: ', error);
    throw error;
  }
}
