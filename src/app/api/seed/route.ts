
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Seed users
    const users = [
      {
        uid: 'some-unique-id-1',
        email: 'localcoinapp@gmail.com',
        role: 'admin',
        walletBalance: 0,
      },
      {
        uid: 'some-unique-id-2',
        email: 'djwilros666@gmail.com',
        role: 'user',
        walletBalance: 0,
      },
      {
        uid: 'some-unique-id-3',
        email: 'katarifarms22@gmail.com',
        role: 'merchant',
        walletBalance: 0,
      },
    ];

    for (const user of users) {
      await setDoc(doc(db, 'users', user.uid), user);
      console.log(`User ${user.email} seeded`);
    }

    // Seed merchants
    const merchant = {
      name: 'Katari Farms',
      owner: 'some-unique-id-3', // Corresponds to katarifarms22@gmail.com
      items: [],
    };

    const docRef = await addDoc(collection(db, 'merchants'), merchant);
    console.log('Merchant seeded with ID: ', docRef.id);

    return NextResponse.json({ message: 'Database seeded successfully.' });
  } catch (error) {
    console.error('Error seeding database: ', error);
    return NextResponse.json({ error: 'Error seeding database.' }, { status: 500 });
  }
}
