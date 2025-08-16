
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
import { ArrowLeft, History, ExternalLink, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, Timestamp, collection, query, where } from "firebase/firestore";
import type { MerchantCashoutRequest } from "@/types";
import { siteConfig } from "@/config/site";
import { Skeleton } from "@/components/ui/skeleton";

type SortOption = 'date-desc' | 'date-asc' | 'amount-asc' | 'amount-desc';
type StatusFilter = 'all' | 'pending' | 'approved' | 'denied';

const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export default function CashoutHistoryPage() {
  const { user } = useAuth();
  const [cashoutHistory, setCashoutHistory] = useState<MerchantCashoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  useEffect(() => {
    if (user && user.merchantId) {
      const q = query(collection(db, 'merchantCashoutRequests'), where("merchantId", "==", user.merchantId));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MerchantCashoutRequest));
        setCashoutHistory(history);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching cashout history:", error);
        setIsLoading(false);
      });
      
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const filteredAndSortedHistory = cashoutHistory
    .filter(req => statusFilter === 'all' || req.status === statusFilter)
    .sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return (b.createdAt?.toDate()?.getTime() || 0) - (a.createdAt?.toDate()?.getTime() || 0);
        case 'date-asc':
          return (a.createdAt?.toDate()?.getTime() || 0) - (b.createdAt?.toDate()?.getTime() || 0);
        case 'amount-asc':
          return a.amount - b.amount;
        case 'amount-desc':
          return b.amount - a.amount;
        default:
          return 0;
      }
    });

  if (isLoading) {
    return <div className="container text-center"><p>Loading cash-out history...</p></div>;
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
                <h1 className="text-3xl font-bold font-headline">Cash-out History</h1>
                <p className="text-muted-foreground">A record of all your cash-out requests.</p>
            </div>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex-row items-center justify-between">
            <div>
                <CardTitle>Request Log</CardTitle>
                <CardDescription>Browse through your historical cash-out data.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
                 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={sortOption} onValueChange={(value) => setSortOption(value as any)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date-desc">Newest First</SelectItem>
                        <SelectItem value="date-asc">Oldest First</SelectItem>
                        <SelectItem value="amount-asc">Amount (Low-High)</SelectItem>
                        <SelectItem value="amount-desc">Amount (High-Low)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead className="text-right">Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedHistory.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                    <TableCell>{req.amount.toFixed(2)} {siteConfig.token.symbol}</TableCell>
                    <TableCell>
                        <Badge 
                            variant={
                                req.status === 'approved' ? 'default' 
                                : req.status === 'denied' ? 'destructive' 
                                : 'outline'
                            }
                            className={req.status === 'approved' ? 'bg-green-600 text-white' : ''}
                        >
                            {req.status}
                        </Badge>
                    </TableCell>
                    <TableCell>{formatDate(req.processedAt)}</TableCell>
                    <TableCell className="text-right">
                        {req.transactionSignature ? (
                             <Button asChild variant="outline" size="sm">
                                <Link href={`https://explorer.solana.com/tx/${req.transactionSignature}?cluster=devnet`} target="_blank">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View on Explorer
                                </Link>
                            </Button>
                        ) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground p-8">
              <Receipt className="mx-auto h-12 w-12 mb-4" />
              <p>You have not made any cash-out requests.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
