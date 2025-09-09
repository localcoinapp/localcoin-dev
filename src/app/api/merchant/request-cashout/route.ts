
import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { Merchant } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { merchantId, amount } = await req.json();

    if (!merchantId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing or invalid merchantId or amount' }, { status: 400 });
    }

    const merchantDocRef = firestore.collection('merchants').doc(merchantId);
    const merchantDoc = await merchantDocRef.get();

    if (!merchantDoc.exists) {
      throw new Error("Merchant document not found.");
    }

    const merchantData = merchantDoc.data() as Merchant;

    if (!merchantData.walletAddress) {
      throw new Error("Merchant wallet address is not configured.");
    }
    
    // Check if merchant has sufficient balance
    if ((merchantData.walletBalance || 0) < amount) {
        throw new Error("Insufficient wallet balance for this cash-out request.");
    }

    const requestsCollection = firestore.collection('merchantCashoutRequests');
    await requestsCollection.add({
      merchantId: merchantId,
      merchantName: merchantData.companyName,
      merchantWalletAddress: merchantData.walletAddress,
      amount: amount,
      status: 'pending',
      createdAt: Timestamp.now(),
    });

    // Optionally, you could deduct the amount from the merchant's balance here
    // to prevent double-spending, or handle it upon approval.
    // For now, we'll let the admin approval process handle the deduction.

    return NextResponse.json({ message: 'Cash-out request submitted successfully.' });

  } catch (error) {
    console.error(`Error in /api/merchant/request-cashout:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: 'Failed to submit cash-out request.', details: errorMessage }, { status: 500 });
  }
}
