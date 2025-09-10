
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
import type { CartItem, OrderStatus } from '@/types';
import { Loader2 } from 'lucide-react';

type SortOption = 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc';


export default function CartPage() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openRedeemDialogId, setOpenRedeemDialogId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

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
    
    // Note: This only updates the user's view. A backend function should ideally
    // notify the merchant and revert stock if this action is allowed after approval.
    const userRef = doc(db, "users", user.id);
    try {
        await runTransaction(db, async tx => {
            const userSnap = await tx.get(userRef);
            if (!userSnap.exists()) throw "User document not found";

            const newCart = (userSnap.data().cart || []).map((item: CartItem) => 
                item.orderId === order.orderId ? {...item, status: 'cancelled'} : item
            );
            tx.update(userRef, { cart: newCart });
        });
        toast({ title: "Order Canceled", description: "Your request has been canceled." });
    } catch(e) {
        toast({ title: "Error", description: "Could not cancel the order.", variant: "destructive"});
    }
  };
  
  const handleRedeemDialogOpenChange = (isOpen: boolean, orderId: string) => {
      if (isOpen) {
        setOpenRedeemDialogId(orderId);
      } else {
        setOpenRedeemDialogId(null);
      }
  };

  const handleRequestRedemption = async (order: CartItem) => {
    if (!user?.id || !order.merchantId) {
        toast({ title: "Error", description: "Missing user or merchant information.", variant: "destructive" });
        return;
    }
    
    setIsProcessing(order.orderId);
    try {
        const response = await fetch('/api/user/request-redemption', {
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
            throw new Error(result.details || 'Failed to request redemption.');
        }
        
        toast({ title: "Success", description: "The merchant has been notified. Show them your code to complete the transaction." });
        setOpenRedeemDialogId(order.orderId); // Open the dialog on success

    } catch(error) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  };

  // Buckets
  const pending = cartItems.filter((item) => item.status === 'pending_approval');
  // User should see items they can act on in their "Approved" tab
  const approved = cartItems.filter((item) => item.status === 'approved' || item.status === 'ready_to_redeem');
  
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
        <Loader2 className="h-8 w-8 animate-spin" />
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 mb-6">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
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
            <CardHeader><CardTitle>Approved & Ready to Redeem</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {approved.length > 0 ? (
                approved.map((item) => (
                  <CartItemCard 
                    key={item.orderId} 
                    cartItem={item} 
                    onAction={() => handleRequestRedemption(item)}
                    actionLabel="Redeem"
                    isRedeemMode={true}
                    isProcessing={isProcessing === item.orderId}
                    isRedeemDialogOpen={openRedeemDialogId === item.orderId}
                    onOpenChange={(isOpen) => handleRedeemDialogOpenChange(isOpen, item.orderId)}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No items have been approved yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Order History</CardTitle>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                  <Select value={historyFilter} onValueChange={(value) => setHistoryFilter(value as any)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
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
                      <SelectTrigger className="w-full sm:w-[180px]">
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
