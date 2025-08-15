
import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getMint,
} from '@solana/spl-token';
import { siteConfig } from '@/config/site';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { MerchantCashoutRequest, Merchant } from '@/types';
import * as bip39 from 'bip39';

// Derive keypair from mnemonic
function keypairFromMnemonic(mnemonic: string, passphrase = ''): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  return Keypair.fromSeed(seed.slice(0, 32));
}

function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}

export async function POST(req: NextRequest) {
  console.log('--- Received POST /api/admin/process-cashout-request ---');

  let requestId: string | null = null;
  try {
    const body = await req.json();
    requestId = body.requestId;

    if (!requestId) {
      return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
    }

    // Get the request document
    const requestRef = doc(db, 'merchantCashoutRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = requestSnap.data() as MerchantCashoutRequest;
    if (requestData.status && requestData.status !== 'pending') {
      return NextResponse.json({ error: `Request already ${requestData.status}` }, { status: 400 });
    }

    const { merchantId, amount: amountWhole } = requestData;

    // Get the merchant document to retrieve their seed phrase
    const merchantRef = doc(db, 'merchants', merchantId);
    const merchantSnap = await getDoc(merchantRef);
    if (!merchantSnap.exists()) {
      throw new Error('Merchant document not found');
    }
    const merchantData = merchantSnap.data() as Merchant;
    const merchantMnemonic = merchantData.seedPhrase;

    if (!merchantMnemonic) {
      throw new Error('Merchant seed phrase not found. Cannot authorize transfer.');
    }

    // --- FIX START: Correctly define platform wallet as recipient ---
    const platformMnemonic = process.env.LOCALCOIN_MNEMONIC;
    if (!platformMnemonic) {
      throw new Error('Platform wallet not configured (set LOCALCOIN_MNEMONIC)');
    }
    const platformKeypair = keypairFromMnemonic(platformMnemonic, process.env.LOCALCOIN_PASSPHRASE || '');
    const recipientPublicKey = platformKeypair.publicKey; // Platform wallet is the recipient
    // --- FIX END ---

    // Merchant's wallet is the sender
    const merchantKeypair = keypairFromMnemonic(merchantMnemonic);

    const connection = new Connection(getRpcUrl(), 'confirmed');
    const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);
    const mintInfo = await getMint(connection, tokenMintPublicKey);
    const decimals = mintInfo.decimals;
    const rawAmount = BigInt(amountWhole * (10 ** decimals));

    // Get ATAs
    const fromAta = await getOrCreateAssociatedTokenAccount(
      connection,
      merchantKeypair, // Payer for ATA creation if needed for the sender
      tokenMintPublicKey,
      merchantKeypair.publicKey
    );

    const toAta = await getOrCreateAssociatedTokenAccount(
      connection,
      platformKeypair, // Platform wallet pays for its own ATA if it doesn't exist
      tokenMintPublicKey,
      recipientPublicKey
    );

    // Create and send transaction
    const ix = createTransferCheckedInstruction(
      fromAta.address,
      tokenMintPublicKey,
      toAta.address,
      merchantKeypair.publicKey, // Merchant is the owner and signer
      rawAmount,
      decimals
    );

    const tx = new Transaction().add(ix);
    // Sign with the MERCHANT's keypair
    const signature = await sendAndConfirmTransaction(connection, tx, [merchantKeypair]);
    console.log('Cashout transfer signature:', signature);

    // Update the request document in Firestore
    await updateDoc(requestRef, {
      status: 'approved',
      processedAt: serverTimestamp(),
      transactionSignature: signature,
    });

    return NextResponse.json({ signature });

  } catch (error: any) {
    console.error('Error in process-cashout-request API:', error);
    if (requestId) {
        try {
            await updateDoc(doc(db, 'merchantCashoutRequests', requestId), {
                status: 'denied',
                processedAt: serverTimestamp(),
                error: String(error?.message || error),
            });
        } catch (e) {
            console.error('Failed to update request status after error:', e);
        }
    }
    return NextResponse.json(
      { error: 'Failed to process cashout request.', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
