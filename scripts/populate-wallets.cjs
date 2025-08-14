// scripts/populate-wallets.cjs

// Using require for broader compatibility
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} = require('@solana/web3.js');
const admin = require('firebase-admin');
const bip39 = require('bip39');
const dotenv = require('dotenv');
const path = require('path');

// --- Firebase Admin SDK Setup ---
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// --- Load Environment Variables ---
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

// --- Solana Setup ---
const SOL_TO_SEND = 0.0005242051739050665;
const LAMPORTS_TO_SEND = Math.floor(SOL_TO_SEND * LAMPORTS_PER_SOL);

function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}

function keypairFromMnemonic(mnemonic, passphrase = '') {
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  return Keypair.fromSeed(seed.slice(0, 32));
}

async function main() {
  console.log('--- Starting Wallet Population Script (Admin Mode) ---');

  const MNEMONIC = process.env.LOCALCOIN_MNEMONIC;
  if (!MNEMONIC) {
    console.error('❌ ERROR: LOCALCOIN_MNEMONIC not found in your .env.local file.');
    return;
  }
  const fromKeypair = keypairFromMnemonic(MNEMONIC);
  console.log(`🔑 Platform Wallet Loaded: ${fromKeypair.publicKey.toBase58()}`);

  const rpc = getRpcUrl();
  const connection = new Connection(rpc, 'confirmed');
  console.log(`✅ Connected to Solana RPC: ${rpc}`);

  const allWallets = new Set();
  
  console.log('Fetching user wallets from Firestore...');
  const usersSnapshot = await db.collection('users').where('walletAddress', '!=', null).get();
  usersSnapshot.forEach(doc => {
    allWallets.add(doc.data().walletAddress);
  });
  console.log(`Found ${usersSnapshot.size} user wallets.`);

  console.log('Fetching merchant wallets from Firestore...');
  const merchantsSnapshot = await db.collection('merchants').where('walletAddress', '!=', null).get();
  merchantsSnapshot.forEach(doc => {
    allWallets.add(doc.data().walletAddress);
  });
  console.log(`Found ${merchantsSnapshot.size} merchant wallets.`);

  allWallets.delete(fromKeypair.publicKey.toBase58());
  
  console.log(`Found a total of ${allWallets.size} unique wallets to populate.`);
  if (allWallets.size === 0) {
    console.log('No wallets to populate. Exiting.');
    return;
  }
  
  const balance = await connection.getBalance(fromKeypair.publicKey);
  const requiredBalance = (LAMPORTS_TO_SEND * allWallets.size) + (5000 * allWallets.size);
  
  console.log(`Platform wallet SOL balance: ${balance / LAMPORTS_PER_SOL}`);
  console.log(`Estimated SOL required: ${requiredBalance / LAMPORTS_PER_SOL}`);
  
  if (balance < requiredBalance) {
    console.error('❌ ERROR: Insufficient SOL in platform wallet.');
    console.error(`Please airdrop at least ${((requiredBalance - balance) / LAMPORTS_PER_SOL).toFixed(4)} SOL to the platform wallet.`);
    return;
  }

  console.log(`\n--- Sending ${SOL_TO_SEND} SOL to each wallet... ---`);
  let successCount = 0;
  let failCount = 0;

  for (const address of allWallets) {
    try {
      const toPublicKey = new PublicKey(address);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: LAMPORTS_TO_SEND,
        })
      );
      
      const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
      console.log(`✅ Success for ${address}: Signature ${signature}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed for ${address}: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n--- Population Complete ---');
  console.log(`Successfully sent to: ${successCount} wallets.`);
  console.log(`Failed to send to: ${failCount} wallets.`);
}

main().catch(err => {
  console.error('An unexpected error occurred:', err);
});
