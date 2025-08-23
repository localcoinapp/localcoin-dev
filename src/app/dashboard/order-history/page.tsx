
'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import type { CartItem, OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

type SortOption = 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc';

const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orderHistory, setOrderHistory] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  useEffect(() => {
    if (user && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Fetch from both pending and recent to get all historical items
          const pending = data?.pendingOrders || [];
          const recent = data?.recentTransactions || [];
          const allOrders = [...pending, ...recent];
          const historicalStatuses: OrderStatus[] = ['completed', 'rejected', 'cancelled', 'refunded'];
          const history = allOrders.filter((order: CartItem) => historicalStatuses.includes(order.status));
          setOrderHistory(history);
        } else {
          setOrderHistory([]);
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching order history:", error);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const filteredAndSortedHistory = orderHistory
    .filter(order => statusFilter === 'all' || order.status === statusFilter)
    .sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
            return (b.redeemedAt?.toDate() || b.timestamp?.toDate() || 0) - (a.redeemedAt?.toDate() || a.timestamp?.toDate() || 0);
        case 'date-asc':
            return (a.redeemedAt?.toDate() || a.timestamp?.toDate() || 0) - (b.redeemedAt?.toDate() || b.timestamp?.toDate() || 0);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        default:
          return 0;
      }
    });

  if (isLoading) {
    return <div className="container text-center"><p>Loading order history...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <Link href="/dashboard" passHref>
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold font-headline">Order History</h1>
                <p className="text-muted-foreground">A record of all past orders.</p>
            </div>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex-row items-center justify-between">
            <div>
                <CardTitle>Past Orders</CardTitle>
                <CardDescription>Browse through your historical order data.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
                 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
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
                 <Select value={sortOption} onValueChange={(value) => setSortOption(value as any)}>
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
        <CardContent>
          {filteredAndSortedHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item</TableHead>
                   <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedHistory.map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-mono text-xs">{order.orderId.substring(0, 8)}...</TableCell>
                    <TableCell>{order.userName}</TableCell>
                    <TableCell>{order.title}</TableCell>
                    <TableCell>{order.price.toFixed(2)}</TableCell>
                    <TableCell>
                        <Badge 
                            variant={
                                order.status === 'completed' ? 'default' 
                                : order.status === 'rejected' ? 'destructive' 
                                : order.status === 'refunded' ? 'secondary'
                                : 'outline'
                            }
                            className={cn(
                                order.status === 'completed' ? 'bg-green-600 text-white' : '',
                                order.status === 'refunded' ? 'bg-blue-500 text-white' : ''
                             )}
                        >
                            {order.status}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(order.redeemedAt || order.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground p-8">
              <History className="mx-auto h-12 w-12 mb-4" />
              <p>No historical orders found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
