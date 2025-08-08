
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { CartItem, OrderStatus } from '@/types';

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';


export default function CartPage() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openRedeemDialogId, setOpenRedeemDialogId] = useState<string | null>(null);

  // State for history filtering and sorting
  const [historyFilter, setHistoryFilter] = useState<OrderStatus | 'all'>('all');
  const [historySort, setHistorySort] = useState<SortOption>('date-desc');


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
        const cart = (userData?.cart as CartItem[] | undefined) ?? [];
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

  const handleCancelOrder = async (order: CartItem) => {
    if (!user?.id) return;
    // Simplified cancel logic to just update status
    const userRef = doc(db, "users", user.id);
    const merchantRef = doc(db, "merchants", order.merchantId);
    try {
        await runTransaction(db, async tx => {
            const userSnap = await tx.get(userRef);
            const merchSnap = await tx.get(merchantRef);
            if (!userSnap.exists() || !merchSnap.exists()) throw "Doc not found";

            const newCart = (userSnap.data().cart || []).map((item: CartItem) => 
                item.orderId === order.orderId ? {...item, status: 'cancelled'} : item
            );
            const newPending = (merchSnap.data().pendingOrders || []).map((item: CartItem) => 
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
  
  const handleRedeemDialogOpenChange = (isOpen: boolean, order: CartItem) => {
    if (isOpen) {
      // Check wallet balance BEFORE opening the dialog
      const currentBalance = user?.walletBalance || 0;
      if (currentBalance < order.price) {
        toast({
          title: "Insufficient Funds",
          description: "Sorry, you do not have enough funds. Please top up your wallet.",
          variant: "destructive"
        });
        setOpenRedeemDialogId(null); // Explicitly keep it closed
        return;
      }
      setOpenRedeemDialogId(order.orderId);
    } else {
      setOpenRedeemDialogId(null);
    }
  }


  const handleApproveToRedeem = async (order: CartItem) => {
    if (!user?.id) return;
    
    const userDocRef = doc(db, 'users', user.id);
    const merchantDocRef = doc(db, 'merchants', order.merchantId);

    try {
      await runTransaction(db, async (tx) => {
        const [userSnap, merchantSnap] = await Promise.all([tx.get(userDocRef), tx.get(merchantDocRef)]);
        if (!userSnap.exists() || !merchantSnap.exists()) throw new Error("User or merchant document not found");

        const userData = userSnap.data();
        const merchantData = merchantSnap.data();

        const updatedUserCart = (userData.cart || []).map((item: CartItem) =>
          item.orderId === order.orderId ? { ...item, status: 'ready_to_redeem' } : item
        );
        const updatedPendingOrders = (merchantData.pendingOrders || []).map((item: CartItem) =>
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
  
  const history = cartItems
    .filter((item) => ['rejected', 'cancelled', 'completed', 'refunded'].includes(item.status))
    .filter(item => historyFilter === 'all' || item.status === historyFilter)
    .sort((a, b) => {
        switch (historySort) {
            case 'date-desc':
                return (b.redeemedAt?.toDate() || b.timestamp?.toDate() || 0) - (a.redeemedAt?.toDate() || a.timestamp?.toDate() || 0);
            case 'date-asc':
                return (a.redeemedAt?.toDate() || a.timestamp?.toDate() || 0) - (b.redeemedAt?.toDate() || b.timestamp?.toDate() || 0);
            case 'name-asc':
                return a.title.localeCompare(b.title);
            case 'name-desc':
                return b.title.localeCompare(a.title);
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            default:
                return 0;
        }
    });


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
                    onOpenChange={(isOpen) => handleRedeemDialogOpenChange(isOpen, item)}
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
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Order History</CardTitle>
              <div className="flex items-center gap-4">
                  <Select value={historyFilter} onValueChange={(value) => setHistoryFilter(value as any)}>
                      <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                  </Select>
                   <Select value={historySort} onValueChange={(value) => setHistorySort(value as any)}>
                      <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="date-desc">Newest First</SelectItem>
                          <SelectItem value="date-asc">Oldest First</SelectItem>
                          <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                          <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                          <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                          <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
            </CardHeader>
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
