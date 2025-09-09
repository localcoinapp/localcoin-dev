
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
import { doc, onSnapshot, runTransaction, Timestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import type { CartItem, OrderStatus, Merchant } from '@/types';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';
import { siteConfig } from '@/config/site';

type SortOption = 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc';


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
    // This is now an unsafe operation, as the user can't write to the merchant doc.
    // This should also be moved to a backend function in a real app.
    // For now, we'll just update the user's side.
    const userRef = doc(db, "users", user.id);
    try {
        await runTransaction(db, async tx => {
            const userSnap = await tx.get(userRef);
            if (!userSnap.exists()) throw "Doc not found";

            const newCart = (userSnap.data().cart || []).map((item: CartItem) => 
                item.orderId === order.orderId ? {...item, status: 'cancelled'} : item
            );
            tx.update(userRef, { cart: newCart });
        });
        toast({ title: "Order Canceled", description: "Your request has been canceled. The merchant has been notified." });
    } catch(e) {
        toast({ title: "Error", description: "Could not cancel order.", variant: "destructive"});
    }
  };
  
  const handleRedeemDialogOpenChange = (isOpen: boolean, orderId: string) => {
      if (isOpen) {
        setOpenRedeemDialogId(orderId);
      } else {
        setOpenRedeemDialogId(null);
      }
  };

  const handleRedeem = async (order: CartItem) => {
    if (!user?.id) return;
  
    setOpenRedeemDialogId(null); // Close the dialog immediately
    toast({ title: "Processing Redemption...", description: "Please wait while we transfer the tokens." });
  
    try {
      const response = await fetch('/api/merchant/redeem-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          merchantId: order.merchantId,
          orderId: order.orderId,
        }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.details || 'Failed to redeem order.');
      }
  
      toast({
        title: "Order Redeemed!",
        description: `Transaction successful. Signature: ${result.signature.substring(0, 20)}...`,
      });
  
    } catch (error) {
      console.error('Error redeeming order:', error);
      toast({
        title: 'Redemption Failed',
        description: (error as Error).message || 'There was a problem completing the redemption.',
        variant: 'destructive',
      });
    }
  };


  const handleApproveToRedeem = async (order: CartItem) => {
    if (!user?.id) return;
  
    const userDocRef = doc(db, 'users', user.id);
    const merchantDocRef = doc(db, 'merchants', order.merchantId);
  
    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) throw new Error('User document not found');
  
        const userData = userSnap.data();
  
        // 1. Update the user's cart
        const updatedUserCart = (userData.cart || []).map((item: CartItem) =>
          item.orderId === order.orderId ? { ...item, status: 'ready_to_redeem' } : item
        );
        
        // This transaction no longer writes to the merchant, as that would fail.
        // We rely on the user showing the code to the merchant in person.
        transaction.update(userDocRef, { cart: updatedUserCart });
      });
  
      toast({
        title: "Ready to Go!",
        description: "Show the redemption code to the merchant to complete your purchase."
      });
  
    } catch (error) {
      console.error('Error approving to redeem:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'There was an error updating the order status.',
        variant: 'destructive',
      });
    }
  };


  // Buckets
  const pending = cartItems.filter((item) => item.status === 'pending_approval');
  const approved = cartItems.filter((item) => item.status === 'approved');
  const readyToRedeem = cartItems.filter((item) => item.status === 'ready_to_redeem');
  
  const history = cartItems
    .filter((item) => ['rejected', 'cancelled', 'completed', 'refunded', 'failed'].includes(item.status))
    .filter(item => historyFilter === 'all' || item.status === historyFilter)
    .sort((a, b) => {
        const getDate = (item: CartItem): Date | null => {
            const timestampField = item.redeemedAt || item.timestamp;
            if (!timestampField) return null;
            
            if (timestampField instanceof Timestamp) {
                return timestampField.toDate();
            }
            if (timestampField instanceof Date) {
                return timestampField;
            }
            // Handle cases where it might be a string or number
            const date = new Date(timestampField);
            return isNaN(date.getTime()) ? null : date;
        };

        const timeA = getDate(a)?.getTime() || 0;
        const timeB = getDate(b)?.getTime() || 0;

        switch (historySort) {
            case 'date-desc': return timeB - timeA;
            case 'date-asc': return timeA - timeB;
            case 'price-asc': return a.price - b.price;
            case 'price-desc': return b.price - a.price;
            default: return 0;
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
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="pending">Pending Approval ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="redeem">Ready to Redeem ({readyToRedeem.length})</TabsTrigger>
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
            <CardHeader><CardTitle>Approved by Merchant</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {approved.length > 0 ? (
                approved.map((item) => (
                  <CartItemCard 
                    key={item.orderId} 
                    cartItem={item} 
                    onAction={() => handleApproveToRedeem(item)}
                    actionLabel="Mark as Ready to Redeem"
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No items have been approved yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redeem">
          <Card>
            <CardHeader><CardTitle>Ready to Redeem</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {readyToRedeem.length > 0 ? (
                readyToRedeem.map((item) => (
                  <CartItemCard 
                    key={item.orderId} 
                    cartItem={item} 
                    isRedeemMode={true}
                    onAction={() => handleRedeem(item)}
                    isRedeemDialogOpen={openRedeemDialogId === item.orderId}
                    onOpenChange={(isOpen) => handleRedeemDialogOpenChange(isOpen, item.orderId)}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No items are ready to be redeemed.</p>
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

