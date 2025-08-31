
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Seeding logic has been removed.
    // Users and merchants should be created through the app's UI.
    console.log('Seed endpoint called, but no data was seeded as per configuration.');
    return NextResponse.json({ message: 'Seeding is disabled. No data was added to the database.' });
  } catch (error) {
    console.error('Error in seed route: ', error);
    return NextResponse.json({ error: 'Error in seed route.' }, { status: 500 });
  }
}
