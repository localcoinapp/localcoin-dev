
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
import { CartItemCard } from "@/components/cart/cart-item";

import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

interface Order {
  orderId: string;
  title: string;
  itemId: string; 
  price: number;
  quantity: number;
  merchantId: string;
  merchantName: string;
  redeemCode: string | null;
  status: 'pending_approval' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'ready_to_redeem';
}

export default function CartPage() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openRedeemDialogId, setOpenRedeemDialogId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setCartItems([]);
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", user.id);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const userData = snap.data();
        const cart = (userData?.cart as Order[] | undefined) ?? [];
        setCartItems(cart.filter(Boolean));
      } else {
        setCartItems([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user cart:", error);
      setCartItems([]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCancelOrder = async (order: Order) => {
    if (!user?.id) return;
    // Simplified cancel logic to just update status
    const userRef = doc(db, "users", user.id);
    const merchantRef = doc(db, "merchants", order.merchantId);
    try {
        await runTransaction(db, async tx => {
            const userSnap = await tx.get(userRef);
            const merchSnap = await tx.get(merchantRef);
            if (!userSnap.exists() || !merchSnap.exists()) throw "Doc not found";

            const newCart = (userSnap.data().cart || []).map((item: Order) => 
                item.orderId === order.orderId ? {...item, status: 'cancelled'} : item
            );
            const newPending = (merchSnap.data().pendingOrders || []).map((item: Order) => 
                item.orderId === order.orderId ? {...item, status: 'cancelled'} : item
            );
            tx.update(userRef, { cart: newCart });
            tx.update(merchantRef, { pendingOrders: newPending });
        });
        toast({ title: "Order Canceled" });
    } catch(e) {
        toast({ title: "Error", description: "Could not cancel order.", variant: "destructive"});
    }
  };

  const handleApproveToRedeem = async (order: Order) => {
    if (!user?.id) return;

    // Check wallet balance
    const currentBalance = user.walletBalance || 0;
    if (currentBalance < order.price) {
        toast({
            title: "Insufficient Funds",
            description: "Sorry, you do not have enough funds. Please top up your wallet.",
            variant: "destructive"
        });
        return; // Halt the process
    }

    const userDocRef = doc(db, 'users', user.id);
    const merchantDocRef = doc(db, 'merchants', order.merchantId);

    try {
      await runTransaction(db, async (tx) => {
        const [userSnap, merchantSnap] = await Promise.all([tx.get(userDocRef), tx.get(merchantDocRef)]);
        if (!userSnap.exists() || !merchantSnap.exists()) throw new Error("User or merchant document not found");

        const userData = userSnap.data();
        const merchantData = merchantSnap.data();

        const updatedUserCart = (userData.cart || []).map((item: Order) =>
          item.orderId === order.orderId ? { ...item, status: 'ready_to_redeem' } : item
        );
        const updatedPendingOrders = (merchantData.pendingOrders || []).map((item: Order) =>
          item.orderId === order.orderId ? { ...item, status: 'ready_to_redeem' } : item
        );

        tx.update(userDocRef, { cart: updatedUserCart });
        tx.update(merchantDocRef, { pendingOrders: updatedPendingOrders });
      });

      toast({
        title: "Ready to Redeem",
        description: "The merchant has been notified and is ready to redeem your item.",
      });
      // NOTE: We do NOT close the dialog here. The user must do it manually.
    } catch (error) {
      console.error("Error approving to redeem:", error);
      toast({
        title: "Error",
        description: "There was an error updating the order status.",
        variant: "destructive",
      });
    }
  };


  // Buckets
  const pending = cartItems.filter((item) => item.status === 'pending_approval');
  const approved = cartItems.filter((item) => ['approved', 'ready_to_redeem'].includes(item.status));
  const history = cartItems.filter((item) => ['rejected', 'cancelled', 'completed'].includes(item.status));

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

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="pending">Pending Approval ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Ready to Redeem ({approved.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader><CardTitle>Pending Merchant Approval</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {pending.length > 0 ? (
                pending.map((item) => (
                  <CartItemCard key={item.orderId} cartItem={item} onCancel={() => handleCancelOrder(item)} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">You have no pending requests.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader><CardTitle>Ready to Redeem</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {approved.length > 0 ? (
                approved.map((item) => (
                  <CartItemCard 
                    key={item.orderId} 
                    cartItem={item} 
                    onRedeem={() => handleApproveToRedeem(item)}
                    isRedeemDialogOpen={openRedeemDialogId === item.orderId}
                    onOpenChange={(isOpen) => setOpenRedeemDialogId(isOpen ? item.orderId : null)}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No approved items to redeem.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Order History</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {history.length > 0 ? (
                history.map((item) => (
                  <CartItemCard key={item.orderId} cartItem={item} />
                ))
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
