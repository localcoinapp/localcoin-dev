
import { db } from '@/lib/firebase';
import { collection, query, getDocs, writeBatch } from 'firebase/firestore';
import { NextResponse } from 'next/server';

// This is the ID of the merchant document you want to KEEP.
const MERCHANT_ID_TO_KEEP = 'CI3v89nhEqJVAm59oRdt';

export async function GET() {
  try {
    console.log(`Starting cleanup. Keeping merchant with ID: ${MERCHANT_ID_TO_KEEP}`);
    
    const merchantsRef = collection(db, 'merchants');
    const q = query(merchantsRef);
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ message: 'Merchant collection is already empty. No action taken.' });
    }

    // Use a batch to delete all documents in one atomic operation.
    const batch = writeBatch(db);
    let deletedCount = 0;

    querySnapshot.forEach((doc) => {
      // Check if the document ID is the one we want to keep.
      if (doc.id !== MERCHANT_ID_TO_KEEP) {
        batch.delete(doc.ref);
        deletedCount++;
        console.log(`Marking for deletion: ${doc.id}`);
      } else {
        console.log(`Skipping deletion for: ${doc.id}`);
      }
    });

    // Commit the batch
    await batch.commit();
    
    const message = `Cleanup complete. Deleted ${deletedCount} merchant document(s).`;
    console.log(message);
    return NextResponse.json({ message });

  } catch (error) {
    console.error('Error cleaning up merchants: ', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Error cleaning up merchants.', details: errorMessage }, { status: 500 });
  }
}
