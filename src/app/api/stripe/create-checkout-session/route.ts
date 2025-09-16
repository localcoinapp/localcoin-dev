
// app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDB } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const getStripeInstance = (currency: 'EUR' | 'USD') => {
  const key = currency === 'EUR' ? process.env.STRIPE_SECRET_KEY_EUR : process.env.STRIPE_SECRET_KEY_USD;
  if (!key) {
    console.error(`CRITICAL: Stripe secret key for ${currency} is missing`);
    throw new Error(`Stripe payments for ${currency} are not configured on the server.`);
  }
  return new Stripe(key, { apiVersion: '2024-04-10' });
};

export async function POST(req: NextRequest) {
  // Hard fail early if either secret is missing
  if (!process.env.STRIPE_SECRET_KEY_EUR || !process.env.STRIPE_SECRET_KEY_USD) {
    return NextResponse.json({ error: 'Server configuration error.', details: 'Stripe payments are not configured.' }, { status: 500 });
  }

  try {
    const { amount, currency, userId, userName, userWalletAddress } = await req.json();
    if (!amount || !currency || !userId || !userWalletAddress) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const stripe = getStripeInstance(currency);
    const db = adminDB(); // Admin Firestore

    // Create pending request (server-trusted write)
    const pendingRef = await db.collection('tokenPurchaseRequests').add({
      userId,
      userName: userName ?? null,
      userWalletAddress,
      amount: Number(amount),
      status: 'pending',
      createdAt: new Date(),
      currency,
      paymentMethod: 'stripe',
    });

    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'klarna'],
      line_items: [{
        price_data: {
          currency: String(currency).toLowerCase(),
          product_data: {
            name: 'LocalCoin Token Purchase',
            description: `Purchase of ${amount} tokens for the LocalCoin platform.`,
          },
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/wallet?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/wallet?stripe_payment_cancelled=true`,
      client_reference_id: pendingRef.id,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('Error creating Stripe session:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session.', details: (err as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
