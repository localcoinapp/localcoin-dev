'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
// Remove this import as merchants data will not be used for hardcoded items
// import { merchants } from "@/data/merchants";
// Remove this import as it's for the hardcoded items
// import type { CartItem, MerchantItem } from "@/types";
import { CartItemCard } from "@/components/cart/cart-item"; // Assuming CartItemCard can handle the new order object structure

import { useAuth } from "@/hooks/use-auth"; // Import useAuth
import { db } from "@/lib/firebase"; // Import db
import { doc, onSnapshot } from "firebase/firestore"; // Import doc and onSnapshot

// Remove all hardcoded cartItems data
// const kaffeeKlatsch = merchants.find(m => m.id === '1')!;
// const coworking = merchants.find(m => m.id === '3')!;
// const restaurant = merchants.find(m => m.id === '4')!;
// const cartItems: CartItem[] = [ ... ]; // Remove this entire block

interface Order {
  orderId: string; // Assuming orderId will be stored here
  title: string;
  price: number;
  quantity: number;
  merchantId: string;
  merchantName: string;
  redeemCode: string | null;
  status: 'pending_approval' | 'ready_to_redeem' | 'rejected' | 'cancelled' | 'completed';
  // Add other fields as needed, like timestamps
}


export default function CartPage() {
  const { user } = useAuth(); // Get the current user
  const [cartItems, setCartItems] = useState<Order[]>([]); // State to hold real cart items from the database
  const [isLoading, setIsLoading] = useState(true); // Loading state


  useEffect(() => {
    if (user) {
      if (user.uid) { // Add check for user.uid
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
           // Check if 'cart' array exists and is an array, otherwise default to empty array
          setCartItems((userData?.cart as Order[] || []).filter(item => item !== null && item !== undefined)); // Ensure null/undefined items are filtered out
        } else {
          setCartItems([]); // Set cart to empty if user document doesn't exist (shouldn't happen if logged in)
        }
        setIsLoading(false); // Set loading to false after initial data fetch
      }, (error) => {
        console.error("Error fetching user cart:", error);
        setCartItems([]); // Set cart to empty on error
        setIsLoading(false); // Set loading to false on error
      });
       return () => unsubscribe(); // Clean up the subscription
      } else {
         setCartItems([]); // Clear cart if user exists but uid is not available
         setIsLoading(false); // Set loading to false
      }
      return () => unsubscribe(); // Clean up the subscription
    } else {
      setCartItems([]); // Clear cart if user is not logged in
      setIsLoading(false); // Set loading to false if user is not logged in
    }
  }, [user]); // Re-run effect if user changes


  // Filter items based on status
  const pending = cartItems.filter(item => item.status === 'pending_approval');
  const approved = cartItems.filter(item => item.status === 'ready_to_redeem');
  const history = cartItems.filter(item => ['rejected', 'cancelled', 'completed'].includes(item.status));


  if (!user) {
      return (
         <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
            <p>Please log in to view your cart.</p>
         </div>
      );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <p>Loading cart...</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-left mb-8">
        <h1 className="text-4xl font-headline font-bold">My Cart</h1>
        <p className="text-muted-foreground mt-2">
          Manage your requests and redeem approved items.
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full"> {/* Set default to pending */}
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="pending">Pending Approval ({pending.length})</TabsTrigger> {/* Show count */}
          <TabsTrigger value="approved">Ready to Redeem ({approved.length})</TabsTrigger> {/* Show count */}
          <TabsTrigger value="history">History ({history.length})</TabsTrigger> {/* Show count */}
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Merchant Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {pending.length > 0 ? (
                pending.map(item => <CartItemCard key={item.orderId} cartItem={item} />) // Use orderId as key
              ) : (
                <p className="text-muted-foreground text-center py-8">You have no pending requests.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Ready to Redeem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {approved.length > 0 ? (
                approved.map(item => <CartItemCard key={item.orderId} cartItem={item} />) // Use orderId as key
              ) : (
                <p className="text-muted-foreground text-center py-8">No approved items to redeem.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {history.length > 0 ? (
                 history.map(item => <CartItemCard key={item.orderId} cartItem={item} />) // Use orderId as key
              ) : (
                 <p className="text-muted-foreground text-center py-8">Your order history is empty.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
