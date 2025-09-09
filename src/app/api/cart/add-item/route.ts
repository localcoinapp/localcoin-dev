
import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { CartItem, MerchantItem, User } from '@/types';
import { Timestamp, arrayUnion } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId, merchantId, item, quantity } = await req.json();

    if (!userId || !merchantId || !item || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    await firestore.runTransaction(async (transaction) => {
      const userDocRef = firestore.collection('users').doc(userId);
      const merchantDocRef = firestore.collection('merchants').doc(merchantId);

      const [userDoc, merchantDoc] = await Promise.all([
        transaction.get(userDocRef),
        transaction.get(merchantDocRef),
      ]);

      if (!userDoc.exists) throw new Error("User document not found.");
      if (!merchantDoc.exists) throw new Error("Merchant document not found.");

      const userData = userDoc.data() as User;
      const merchantData = merchantDoc.data()!;
      const currentListings = (merchantData.listings || []) as MerchantItem[];
      
      const listingIndex = currentListings.findIndex(l => l.id === item.id);
      if (listingIndex === -1) throw new Error("Item not found in merchant's listings.");

      const listing = currentListings[listingIndex];
      if (!listing.active) throw new Error("This item is currently unavailable.");
      if (listing.quantity < quantity) throw new Error("Not enough items in stock.");

      // All checks passed, proceed with transaction
      
      // 1. Decrement stock
      listing.quantity -= quantity;
      currentListings[listingIndex] = listing;

      // 2. Create the order item for both user and merchant
      const orderId = `order_${userId.substring(0, 5)}_${Date.now()}`;
      const newOrderItem: CartItem = {
        orderId,
        title: item.name,
        itemId: item.id,
        listingId: item.id, // Keep for backward compatibility/analytics
        price: item.price * quantity,
        quantity: quantity,
        merchantId: merchantId,
        merchantName: merchantData.companyName,
        redeemCode: null,
        status: 'pending_approval',
        timestamp: Timestamp.now(),
        userId: userId,
        userName: userData.name || 'Anonymous',
        category: item.category,
      };

      // 3. Update documents
      transaction.update(merchantDocRef, { 
        listings: currentListings,
        pendingOrders: arrayUnion(newOrderItem),
      });

      transaction.update(userDocRef, {
        cart: arrayUnion(newOrderItem)
      });
    });

    return NextResponse.json({ message: 'Item successfully added to cart.' });

  } catch (error) {
    console.error(`Error in /api/cart/add-item:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: 'Failed to add item to cart.', details: errorMessage }, { status: 500 });
  }
}
