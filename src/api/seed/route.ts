
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Seeding logic has been permanently removed as per user request.
    // Users and merchants should be created exclusively through the application's UI
    // and administrative approval processes.
    console.log('Seed endpoint was called, but seeding is disabled. No data was added.');
    return NextResponse.json({ message: 'Seeding is disabled. No data was added to the database.' });
  } catch (error) {
    console.error('Error in disabled seed route: ', error);
    return NextResponse.json({ error: 'An error occurred in the seed route.' }, { status: 500 });
  }
}
