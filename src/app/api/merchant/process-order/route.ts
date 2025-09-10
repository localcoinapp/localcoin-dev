
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { CartItem } from '@/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// --- Helper function to find and update inventory ---
const updateInventory = (listings: any[], listingId: string, quantityChange: number): any[] => {
    const listingIndex = listings.findIndex(item => item.id === listingId);
    if (listingIndex > -1) {
        const updatedListings = [...listings];
        const updatedItem = { ...updatedListings[listingIndex] };
        updatedItem.quantity = (updatedItem.quantity || 0) + quantityChange;
        updatedListings[listingIndex] = updatedItem;
        return updatedListings;
    }
    return listings;
};


export async function POST(req: NextRequest) {
  try {
    const { merchantId, userId, orderId, action } = await req.json();

    if (!merchantId || !userId || !orderId || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'deny') {
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    }
    
    // --- Firestore Admin Transaction ---
    await firestore.runTransaction(async (transaction) => {
        const merchantDocRef = firestore.collection('merchants').doc(merchantId);
        const userDocRef = firestore.collection('users').doc(userId);

        const [merchantDoc, userDoc] = await Promise.all([
            transaction.get(merchantDocRef),
            transaction.get(userDocRef),
        ]);
        
        if (!merchantDoc.exists) throw new Error("Merchant document not found.");
        if (!userDoc.exists) throw new Error("User document not found.");

        const merchantData = merchantDoc.data()!;
        const userData = userDoc.data()!;

        const pendingOrders = (merchantData.pendingOrders || []) as CartItem[];
        const orderIndex = pendingOrders.findIndex(o => o.orderId === orderId);

        if (orderIndex === -1) throw new Error("Order not found in merchant's pending orders.");

        const order = pendingOrders[orderIndex];
        const userCart = (userData.cart || []) as CartItem[];
        
        if (action === 'approve') {
            const redeemCode = Math.random().toString(36).substring(2, 10).toUpperCase();

            // Update order status to 'ready_to_redeem' in merchant's pending orders
            order.status = 'ready_to_redeem';
            order.redeemCode = redeemCode;

            // Update user's cart
            const updatedUserCart = userCart.map(item =>
                item.orderId === orderId ? { ...item, status: 'ready_to_redeem', redeemCode } : item
            );
            
            transaction.update(merchantDocRef, { pendingOrders: pendingOrders });
            transaction.update(userDocRef, { cart: updatedUserCart });

        } else if (action === 'deny') {
            // Remove from pending orders
            const updatedPendingOrders = pendingOrders.filter(o => o.orderId !== orderId);
            
            // Update status in user's cart to 'rejected'
            const updatedUserCart = userCart.map(item =>
                item.orderId === orderId ? { ...item, status: 'rejected' } : item
            );
            
            // Add item back to merchant's inventory
            const updatedListings = updateInventory(
                merchantData.listings || [],
                order.listingId,
                order.quantity
            );
            
            // Add to merchant's transaction history as rejected
            const rejectedTransaction = { ...order, status: 'rejected', processedAt: Timestamp.now() };

            transaction.update(merchantDocRef, { 
                pendingOrders: updatedPendingOrders,
                listings: updatedListings,
                recentTransactions: FieldValue.arrayUnion(rejectedTransaction)
            });
            transaction.update(userDocRef, { cart: updatedUserCart });
        }
    });

    return NextResponse.json({ message: `Order successfully ${action === 'approve' ? 'approved' : 'denied'}.` });

  } catch (error) {
    console.error(`Error in /api/merchant/process-order:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: 'Failed to process order.', details: errorMessage }, { status: 500 });
  }
}
