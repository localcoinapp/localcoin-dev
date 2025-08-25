
// This script runs the seedDatabase function from your src directory.
import { seedDatabase } from '../src/lib/seed.js';

async function main() {
  try {
    console.log('Starting database seed...');
    await seedDatabase();
    console.log('Seed script finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();
