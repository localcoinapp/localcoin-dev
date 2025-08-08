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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";

type Order = {
  orderId: string;
  userName: string;
  name: string;
  status: 'completed' | 'rejected' | 'cancelled';
  timestamp?: Timestamp;
  redeemedAt?: Timestamp;
};

const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    // Firebase timestamps have a toDate() method.
    return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const allOrders = data?.pendingOrders || [];
          const history: Order[] = allOrders.filter((order: any) => 
            ['completed', 'rejected', 'cancelled'].includes(order.status)
          );
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
                <p className="text-muted-foreground">A record of all completed, rejected, and canceled orders.</p>
            </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Past Orders</CardTitle>
          <CardDescription>Browse through your historical order data.</CardDescription>
        </CardHeader>
        <CardContent>
          {orderHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderHistory.map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-mono text-xs">{order.orderId.substring(0, 8)}...</TableCell>
                    <TableCell>{order.userName}</TableCell>
                    <TableCell>{order.name}</TableCell>
                    <TableCell>
                        <Badge 
                            variant={
                                order.status === 'completed' ? 'default' 
                                : order.status === 'rejected' ? 'destructive' 
                                : 'secondary'
                            }
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
              <p>No historical orders found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}