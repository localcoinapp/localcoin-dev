
import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { CartItem } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId, merchantId, orderId } = await req.json();

    if (!userId || !merchantId || !orderId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    await firestore.runTransaction(async (transaction) => {
        const userDocRef = firestore.collection('users').doc(userId);
        const merchantDocRef = firestore.collection('merchants').doc(merchantId);

        const [userDoc, merchantDoc] = await Promise.all([
            transaction.get(userDocRef),
            transaction.get(merchantDocRef)
        ]);

        if (!userDoc.exists) throw new Error("User not found.");
        if (!merchantDoc.exists) throw new Error("Merchant not found.");

        const userData = userDoc.data()!;
        const merchantData = merchantDoc.data()!;

        const userCart = (userData.cart || []) as CartItem[];
        const pendingOrders = (merchantData.pendingOrders || []) as CartItem[];

        const orderInUserCartIndex = userCart.findIndex(item => item.orderId === orderId);
        const orderInMerchantPendingIndex = pendingOrders.findIndex(item => item.orderId === orderId);
        
        if (orderInUserCartIndex === -1) throw new Error("Order not found in user's cart.");
        if (orderInMerchantPendingIndex === -1) throw new Error("Order not found in merchant's pending orders.");

        const order = userCart[orderInUserCartIndex];
        if (order.status !== 'approved') {
            throw new Error(`Cannot request redemption. Order status is '${order.status}'.`);
        }

        // Update the status to 'ready_to_redeem' in both places
        userCart[orderInUserCartIndex].status = 'ready_to_redeem';
        pendingOrders[orderInMerchantPendingIndex].status = 'ready_to_redeem';

        transaction.update(userDocRef, { cart: userCart });
        transaction.update(merchantDocRef, { pendingOrders: pendingOrders });
    });

    return NextResponse.json({ message: 'Redemption requested successfully. Merchant has been notified.' });

  } catch (error) {
    console.error(`Error in /api/user/request-redemption:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: 'Failed to request redemption.', details: errorMessage }, { status: 500 });
  }
}
