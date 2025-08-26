
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Initialize Stripe with conditional keys
const getStripeInstance = (currency: 'EUR' | 'USD') => {
    const secretKey = currency === 'EUR' 
        ? process.env.STRIPE_SECRET_KEY_EUR 
        : process.env.STRIPE_SECRET_KEY_USD;

    if (!secretKey) {
        console.error(`CRITICAL: Stripe secret key for ${currency} is not set in environment variables.`);
        throw new Error(`Stripe payments for ${currency} are not configured on the server.`);
    }

    return new Stripe(secretKey, { apiVersion: '2024-04-10' });
};

export async function POST(req: NextRequest) {
    try {
        const { amount, currency, userId, userName, userWalletAddress } = await req.json();

        if (!amount || !currency || !userId || !userWalletAddress) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        
        if (currency === 'EUR' && !process.env.STRIPE_SECRET_KEY_EUR) {
             return NextResponse.json({ error: 'Server configuration error.', details: 'Stripe EUR key is not configured.' }, { status: 500 });
        }
        if (currency === 'USD' && !process.env.STRIPE_SECRET_KEY_USD) {
             return NextResponse.json({ error: 'Server configuration error.', details: 'Stripe USD key is not configured.' }, { status: 500 });
        }

        const stripe = getStripeInstance(currency);

        // --- Create a pending purchase request in Firestore ---
        // This allows us to track the request before the payment is confirmed by Stripe.
        const requestsCollection = collection(db, 'tokenPurchaseRequests');
        const pendingRequestRef = await addDoc(requestsCollection, {
            userId,
            userName,
            userWalletAddress,
            amount: parseFloat(amount),
            status: 'pending', // Status is pending until webhook confirms payment
            createdAt: serverTimestamp(),
            currency,
            paymentMethod: 'stripe',
        });
        // ----------------------------------------------------


        // Get the base URL from the request headers
        const origin = req.headers.get('origin') || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: 'LocalCoin Token Purchase',
                            description: `Purchase of ${amount} tokens for the LocalCoin platform.`,
                        },
                        unit_amount: Math.round(parseFloat(amount) * 100), // Amount in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // IMPORTANT: These URLs must be correctly configured in your application
            success_url: `${origin}/wallet?stripe_session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/wallet?stripe_payment_cancelled=true`,
            // Pass our internal request ID to Stripe metadata
            client_reference_id: pendingRequestRef.id, 
        });

        return NextResponse.json({ sessionId: session.id });

    } catch (error) {
        console.error('Error creating Stripe session:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: 'Failed to create checkout session.', details: errorMessage }, { status: 500 });
    }
}
