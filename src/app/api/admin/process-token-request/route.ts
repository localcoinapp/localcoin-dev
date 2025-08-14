import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getMint,
  getAccount,
} from '@solana/spl-token';
import { siteConfig } from '@/config/site';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { TokenPurchaseRequest } from '@/types';
import * as bip39 from 'bip39';
// NOTE: We are intentionally not using ed25519-hd-key for this new derivation
// import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';

/**
 * --- UPDATED KEY DERIVATION ---
 * This function now uses the simpler derivation method found elsewhere in the codebase,
 * which is more likely to match the wallet's generated address.
 */
function keypairFromMnemonic(mnemonic: string, passphrase = ''): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  // This uses the first 32 bytes of the seed, which is a common derivation method.
  return Keypair.fromSeed(seed.slice(0, 32));
}

function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}
/** -------------------------------- */

export async function POST(req: NextRequest) {
  console.log('--- Received POST /api/admin/process-token-request ---');

  let requestId: string | null = null;
  try {
    const body = await req.json();
    requestId = body.requestId;

    if (!requestId) {
      return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
    }

    const requestRef = doc(db, 'tokenPurchaseRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = requestSnap.data() as TokenPurchaseRequest;
    if (requestData.status && requestData.status !== 'pending') {
      return NextResponse.json(
        { error: `Request already ${requestData.status}` },
        { status: 400 }
      );
    }

    const recipient = requestData.userWalletAddress;
    const amountWhole = Number(requestData.amount);
    if (!recipient || !amountWhole || amountWhole <= 0) {
      return NextResponse.json(
        { error: 'Invalid recipient or amount' },
        { status: 400 }
      );
    }

    const MNEMONIC = process.env.LOCALCOIN_MNEMONIC;
    if (!MNEMONIC) {
      throw new Error('Platform wallet not configured (set LOCALCOIN_MNEMONIC)');
    }
    const issuerKeypair = keypairFromMnemonic(MNEMONIC, process.env.LOCALCOIN_PASSPHRASE || '');
    
    const rpc = getRpcUrl();
    const connection = new Connection(rpc, 'confirmed');

    // --- DIAGNOSTIC LOGGING ---
    console.log(`[DIAGNOSTIC] Issuer PubKey: ${issuerKeypair.publicKey.toBase58()}`);
    const solBalance = await connection.getBalance(issuerKeypair.publicKey);
    console.log(`[DIAGNOSTIC] Issuer SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

    const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);
    const recipientPublicKey = new PublicKey(recipient);
    const mintInfo = await getMint(connection, tokenMintPublicKey);
    const decimals = mintInfo.decimals;

    console.log(`[DIAGNOSTIC] Fetching issuer's token account...`);
    const fromAta = await getOrCreateAssociatedTokenAccount(
      connection,
      issuerKeypair,
      tokenMintPublicKey,
      issuerKeypair.publicKey
    );

    const fromAtaInfo = await getAccount(connection, fromAta.address);
    const tokenBalance = fromAtaInfo.amount;
    console.log(`[DIAGNOSTIC] Issuer Token Balance: ${Number(tokenBalance) / (10**decimals)} LocalCoin`);
    // --- END DIAGNOSTIC LOGGING ---

    if (tokenBalance < BigInt(amountWhole * (10**decimals))) {
        throw new Error(`[VERIFICATION FAILED] Insufficient token balance. On-chain balance is ${Number(tokenBalance) / (10**decimals)}, requested amount is ${amountWhole}.`);
    }

    const toAta = await getOrCreateAssociatedTokenAccount(
      connection,
      issuerKeypair,
      tokenMintPublicKey,
      recipientPublicKey
    );

    console.log('Attempting token transfer...');
    const rawAmount = BigInt(amountWhole) * (10n ** BigInt(decimals));
    const ix = createTransferCheckedInstruction(
      fromAta.address,
      tokenMintPublicKey,
      toAta.address,
      issuerKeypair.publicKey,
      rawAmount,
      decimals
    );

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [issuerKeypair]);
    console.log('Transfer signature:', signature);

    await updateDoc(requestRef, {
      status: 'approved',
      processedAt: serverTimestamp(),
      transactionSignature: signature,
      toAta: toAta.address.toBase58(),
    });

    return NextResponse.json({ signature });
  } catch (error: any) {
    console.error('Error in process-token-request API:', error);
    if (requestId) {
        try {
            const requestRef = doc(db, 'tokenPurchaseRequests', requestId);
            await updateDoc(requestRef, {
                status: 'denied',
                processedAt: serverTimestamp(),
                error: String(error?.message || error),
            });
        } catch (e) {
            console.error('Failed to update request status after error:', e);
        }
    }
    return NextResponse.json(
      { error: 'Failed to process token purchase.', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
