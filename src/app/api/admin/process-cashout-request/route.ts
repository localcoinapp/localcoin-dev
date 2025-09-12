
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
import { adminDB } from '@/lib/firebaseAdmin';
import type { MerchantCashoutRequest, Merchant } from '@/types';
import * as bip39 from 'bip39';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

// Derive keypair from mnemonic
function keypairFromMnemonic(mnemonic: string, passphrase = ''): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  return Keypair.fromSeed(seed.slice(0, 32));
}

function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}

export async function POST(req: NextRequest) {
  // --- Environment Variable Check ---
  if (!process.env.LOCALCOIN_MNEMONIC) {
    console.error('CRITICAL: Missing LOCALCOIN_MNEMONIC environment variable.');
    return NextResponse.json({ error: 'Server configuration error.', details: 'The platform wallet is not configured.' }, { status: 500 });
  }
  // ---------------------------------

  console.log('--- Received POST /api/admin/process-cashout-request ---');

  // Read the body ONCE and get the requestId
  const body = await req.json();
  const requestId: string | null = body.requestId;

  if (!requestId) {
    return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
  }

  try {
    const adb = adminDB();

    // Get the request document
    const requestRef = adb.collection('merchantCashoutRequests').doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = requestSnap.data() as MerchantCashoutRequest;
    if (requestData.status && requestData.status !== 'pending') {
      return NextResponse.json({ error: `Request already ${requestData.status}` }, { status: 400 });
    }

    const { merchantId, amount: amountWhole } = requestData;

    // Get the merchant document to retrieve their seed phrase
    const merchantRef = adb.collection('merchants').doc(merchantId);
    const merchantSnap = await merchantRef.get();
    if (!merchantSnap.exists) {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }
    const merchantData = merchantSnap.data() as Merchant;
    const merchantMnemonic = merchantData.seedPhrase;
    const merchantEmail = merchantData.contactEmail;

    if (!merchantMnemonic) {
      throw new Error('Merchant seed phrase not found. Cannot authorize transfer.');
    }
    if (!merchantEmail) {
        throw new Error("Merchant contact email not found, cannot send notification.");
    }

    const platformMnemonic = process.env.LOCALCOIN_MNEMONIC;
    
    const platformKeypair = keypairFromMnemonic(platformMnemonic, process.env.LOCALCOIN_PASSPHRASE || '');
    const recipientPublicKey = platformKeypair.publicKey;

    const merchantKeypair = keypairFromMnemonic(merchantMnemonic);

    const connection = new Connection(getRpcUrl(), 'confirmed');
    const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);
    const mintInfo = await getMint(connection, tokenMintPublicKey);
    const decimals = mintInfo.decimals;
    const rawAmount = BigInt(amountWhole * (10 ** decimals));

    const fromAta = await getOrCreateAssociatedTokenAccount(
      connection,
      merchantKeypair,
      tokenMintPublicKey,
      merchantKeypair.publicKey
    );

    const toAta = await getOrCreateAssociatedTokenAccount(
      connection,
      platformKeypair,
      tokenMintPublicKey,
      recipientPublicKey
    );

    const ix = createTransferCheckedInstruction(
      fromAta.address,
      tokenMintPublicKey,
      toAta.address,
      merchantKeypair.publicKey,
      rawAmount,
      decimals
    );

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [merchantKeypair]);
    console.log('Cashout transfer signature:', signature);

    // Database update and email now happen *after* successful transaction.
    await requestRef.update({
      status: 'approved',
      processedAt: new Date(),
      transactionSignature: signature,
    });
    
    const commission = amountWhole * siteConfig.commissionRate;
    const netPayout = amountWhole * (1 - siteConfig.commissionRate);
    const subject = `Your ${siteConfig.name} Payout is Complete!`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Payout Statement</h2>
        <p>Hello ${merchantData.companyName},</p>
        <p>Your recent cashout request has been successfully processed. The funds have been settled.</p>
        <hr>
        <h3>Payout Details</h3>
        <p><strong>Request ID:</strong> ${requestId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">Gross Token Cashout (${siteConfig.token.symbol})</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${amountWhole.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">Platform Commission (${(siteConfig.commissionRate * 100).toFixed(0)}%)</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">-${commission.toFixed(2)} ${siteConfig.fiatCurrency.symbol}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Total Payout:</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${netPayout.toFixed(2)} ${siteConfig.fiatCurrency.symbol}</strong></td>
            </tr>
          </tfoot>
        </table>
        <p>Thank you for being a part of our community!</p>
        <p>The ${siteConfig.name} Team</p>
      </div>
    `;

    // Direct email call
    await sendEmail({ to: merchantEmail, subject, html: emailHtml });

    return NextResponse.json({ signature });

  } catch (error: any) {
    console.error('Error in process-cashout-request API:', error);
    // Now the catch block can safely use the requestId
    try {
      await adminDB().collection('merchantCashoutRequests').doc(requestId).update({
        status: 'denied',
        processedAt: new Date(),
        error: String(error?.message || error),
      });
    } catch (e) {
      console.error('Failed to update request status after error:', e);
    }
    return NextResponse.json(
      { error: 'Failed to process cashout request.', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
