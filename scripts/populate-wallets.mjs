// scripts/populate-wallets.mjs
// Run with: node scripts/populate-wallets.mjs

import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
  } from "@solana/web3.js";
  
  import * as bip39 from "bip39";
  import dotenv from "dotenv";
  import { readFileSync } from "node:fs";
  import path from "node:path";
  import { fileURLToPath } from "node:url";
  
  // --- Firebase Admin SDK (ESM, modular) ---
  import { initializeApp, cert } from "firebase-admin/app";
  import { getFirestore } from "firebase-admin/firestore";
  
  // --- Paths / ENV ---
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Load .env.local
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  
  // Load service account JSON safely (no JSON import assertions needed)
  const serviceAccountPath = path.resolve(__dirname, "../firebase-service-account.json");
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  
  // Init Admin
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();
  
  // --- Solana Setup ---
  const SOL_TO_SEND = 0.0005242051739050665;
  const LAMPORTS_TO_SEND = Math.floor(SOL_TO_SEND * LAMPORTS_PER_SOL);
  
  function getRpcUrl() {
    return process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
  }
  
  function keypairFromMnemonic(mnemonic, passphrase = "") {
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
    return Keypair.fromSeed(seed.slice(0, 32));
  }
  
  async function main() {
    console.log("--- Starting Wallet Population Script (Admin Mode) ---");
  
    const MNEMONIC = process.env.LOCALCOIN_MNEMONIC;
    if (!MNEMONIC) {
      console.error("❌ ERROR: LOCALCOIN_MNEMONIC not found in .env.local");
      process.exit(1);
    }
  
    const fromKeypair = keypairFromMnemonic(MNEMONIC);
    console.log(`🔑 Platform Wallet: ${fromKeypair.publicKey.toBase58()}`);
  
    const rpc = getRpcUrl();
    const connection = new Connection(rpc, "confirmed");
    console.log(`✅ Connected to Solana RPC: ${rpc}`);
  
    // --- Collect wallets from Firestore ---
    const allWallets = new Set();
  
    console.log("Fetching user wallets...");
    const usersSnapshot = await db.collection("users").where("walletAddress", "!=", null).get();
    for (const doc of usersSnapshot.docs) {
      const w = doc.data().walletAddress;
      if (w) allWallets.add(w);
    }
    console.log(`Found ${usersSnapshot.size} user wallets.`);
  
    console.log("Fetching merchant wallets...");
    const merchantsSnapshot = await db.collection("merchants").where("walletAddress", "!=", null).get();
    for (const doc of merchantsSnapshot.docs) {
      const w = doc.data().walletAddress;
      if (w) allWallets.add(w);
    }
    console.log(`Found ${merchantsSnapshot.size} merchant wallets.`);
  
    // Don’t fund the sender itself
    allWallets.delete(fromKeypair.publicKey.toBase58());
  
    console.log(`Total unique wallets to populate: ${allWallets.size}`);
    if (allWallets.size === 0) {
      console.log("No wallets to populate. Exiting.");
      return;
    }
  
    const balance = await connection.getBalance(fromKeypair.publicKey);
    const feeBufferLamports = 5000; // rough per-tx buffer
    const requiredLamports = LAMPORTS_TO_SEND * allWallets.size + feeBufferLamports * allWallets.size;
  
    console.log(`Platform wallet SOL balance: ${balance / LAMPORTS_PER_SOL}`);
    console.log(`Estimated SOL required: ${requiredLamports / LAMPORTS_PER_SOL}`);
  
    if (balance < requiredLamports) {
      console.error("❌ ERROR: Insufficient SOL in platform wallet.");
      console.error(
        `Please airdrop at least ${((requiredLamports - balance) / LAMPORTS_PER_SOL).toFixed(4)} SOL to the platform wallet.`
      );
      process.exit(1);
    }
  
    console.log(`\n--- Sending ${SOL_TO_SEND} SOL to each wallet... ---`);
    let successCount = 0;
    let failCount = 0;
  
    for (const address of allWallets) {
      try {
        const toPublicKey = new PublicKey(address);
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: toPublicKey,
            lamports: LAMPORTS_TO_SEND,
          })
        );
  
        // You can also prefetch a blockhash if you want finer control:
        // const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        // tx.recentBlockhash = blockhash;
        // tx.feePayer = fromKeypair.publicKey;
  
        const sig = await sendAndConfirmTransaction(connection, tx, [fromKeypair]);
        console.log(`✅ Sent to ${address}: ${sig}`);
        successCount++;
      } catch (err) {
        console.error(`❌ Failed for ${address}: ${err?.message || err}`);
        failCount++;
      }
    }
  
    console.log("\n--- Population Complete ---");
    console.log(`Successfully sent to: ${successCount} wallets.`);
    console.log(`Failed to send to: ${failCount} wallets.`);
  }
  
  main().catch((err) => {
    console.error("An unexpected error occurred:", err);
    process.exit(1);
  });
  
