
// This script has been intentionally disabled to prevent automatic data seeding.
// All user and merchant creation should be handled through the application's
// sign-up and administrative approval flows.
import { db } from './firebase.js'; // Keep import for potential future safe use
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

export async function seedDatabase() {
  try {
    console.log('seedDatabase function was called, but seeding is permanently disabled. No data was added to the database.');
  } catch (error) {
    console.error('An error occurred within the disabled seedDatabase function:', error);
    // Re-throwing the error is important if any caller expects a Promise rejection.
    throw error;
  }
}

/**
 * Creates the `merchant_owners` lookup collection.
 * This collection maps a user's UID to their merchant ID, which is essential
 * for the security rules to efficiently check if a user is a merchant.
 */
export async function seedMerchantOwners() {
  const merchantsRef = collection(db, 'merchants');
  const ownersRef = collection(db, 'merchant_owners');
  
  try {
    const merchantSnapshot = await getDocs(merchantsRef);
    if (merchantSnapshot.empty) {
      console.log("No merchants found to create owner lookups.");
      return;
    }

    const ownerSnapshot = await getDocs(ownersRef);
    const existingOwnerIds = ownerSnapshot.docs.map(d => d.id);

    let count = 0;
    for (const merchantDoc of merchantSnapshot.docs) {
      const merchant = merchantDoc.data();
      const ownerId = merchant.owner;

      // Only create a lookup if the owner exists and doesn't already have a lookup doc.
      if (ownerId && !existingOwnerIds.includes(ownerId)) {
        const ownerDocRef = doc(db, 'merchant_owners', ownerId);
        await setDoc(ownerDocRef, { merchantId: merchantDoc.id });
        console.log(`Created owner lookup for UID: ${ownerId}`);
        count++;
      }
    }
    
    console.log(`Finished seeding. Created ${count} new owner lookups.`);

  } catch (error) {
    console.error("Error seeding merchant owners lookup:", error);
    throw error;
  }
}
