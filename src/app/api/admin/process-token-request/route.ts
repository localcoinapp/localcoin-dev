
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
import type { TokenPurchaseRequest, User } from '@/types';
import * as bip39 from 'bip39';
import * as nacl from 'tweetnacl';

export const runtime = 'nodejs';

function keypairFromMnemonic(mnemonic: string, passphrase = ''): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  return Keypair.fromSeed(seed.slice(0, 32));
}

function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
}

async function sendConfirmationEmail(origin: string, userEmail: string, subject: string, html: string) {
    const response = await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: userEmail, subject, html }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Failed to send email to ${userEmail}`);
    }
}

export async function POST(req: NextRequest) {
  // --- Environment Variable Check ---
  if (!process.env.LOCALCOIN_MNEMONIC) {
    console.error('CRITICAL: Missing LOCALCOIN_MNEMONIC environment variable.');
    return NextResponse.json({ error: 'Server configuration error.', details: 'The platform wallet is not configured.' }, { status: 500 });
  }
  // ---------------------------------

  let requestId: string | null = null;
  try {
    const origin = req.nextUrl.origin;
    
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
    
    const userDocRef = doc(db, 'users', requestData.userId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
        throw new Error('User document not found, cannot send email notification.');
    }
    const userData = userSnap.data() as User;
    const userEmail = userData.email;
    if (!userEmail) {
        throw new Error('User email not found, cannot send email notification.');
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
    
    const issuerKeypair = keypairFromMnemonic(MNEMONIC, process.env.LOCALCOIN_PASSPHRASE || '');
    
    const rpc = getRpcUrl();
    const connection = new Connection(rpc, 'confirmed');

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
    const rawAmount = BigInt(amountWhole) * (BigInt(10) ** BigInt(decimals));
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

    const subject = `Your ${siteConfig.name} Purchase is Complete!`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Purchase Invoice</h2>
        <p>Hello ${userData.name || 'Valued Customer'},</p>
        <p>Your recent purchase of <strong>${siteConfig.token.name}</strong> tokens has been successfully processed. The tokens have been credited to your wallet.</p>
        <hr>
        <h3>Invoice Details</h3>
        <p><strong>Order ID:</strong> ${requestId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${siteConfig.token.name} (${siteConfig.token.symbol})</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${amountWhole.toFixed(2)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Total Paid:</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>${amountWhole.toFixed(2)} ${siteConfig.fiatCurrency.symbol}</strong></td>
            </tr>
          </tfoot>
        </table>
        <p>Thank you for your purchase!</p>
        <p>The ${siteConfig.name} Team</p>
      </div>
    `;
    
    await sendConfirmationEmail(origin, userEmail, subject, emailHtml);

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
