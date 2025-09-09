
// This script runs the seedDatabase function from your src directory.
// It should only be run once, or when you need to reset your merchant data.
import { seedDatabase, seedMerchantOwners } from '../src/lib/seed.js';

async function main() {
  try {
    console.log('Starting database seed...');
    // Note: The main seed function is disabled by default.
    await seedDatabase();

    // This function will create the merchant_owners lookup collection.
    // It's safe to run multiple times. It will only add entries for merchants missing one.
    console.log('Seeding merchant owner lookup collection...');
    await seedMerchantOwners();

    console.log('Seed script finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();
