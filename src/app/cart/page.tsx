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
    console.log("User object in useEffect:", user);
    let unsubscribe: () => void; // Declare unsubscribe outside the if blocks

    // Change condition to check for user.id
    if (user && user.id) {
        console.log("User ID (document ID):", user.id); // Log user.id
        // Use user.id for the document reference
        const userDocRef = doc(db, "users", user.id);
        unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                console.log("Fetched user data:", doc.data());
                const userData = doc.data();
                console.log("Cart items state (before set):", cartItems); // Log before setting state
                // Check if 'cart' array exists and is an array, otherwise default to empty array
                setCartItems((userData?.cart as Order[] || []).filter(item => item !== null && item !== undefined)); // Ensure null/undefined items are filtered out
                console.log("Cart items state (after set):", cartItems); // Log after setting state
            } else {
                console.log("User document does not exist."); // Add this line
                setCartItems([]); // Set cart to empty if user document doesn't exist (shouldn't happen if logged in)
            }
            setIsLoading(false); // Set loading to false after initial data fetch
        }, (error) => {
            console.error("Error fetching user cart:", error);
            setCartItems([]); // Set cart to empty on error
            setIsLoading(false); // Set loading to false on error
        });

        // Return the cleanup function here, within the block where unsubscribe is defined
        return () => unsubscribe();
    } else {
        // This message is now more accurate if user or user.id is missing
        console.log("User object or user ID is missing."); // Add this line
        setCartItems([]); // Clear cart if user is not logged in or id is not available
        setIsLoading(false); // Set loading to false if user is not logged in or id is not available
    }

    // No cleanup needed if unsubscribe was not defined
    return undefined;

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
