
'use client';

import { useState, useEffect } from "react";
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
import { ExternalLink, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { TokenPurchaseRequest } from "@/types";
import { siteConfig } from "@/config/site";
import { Skeleton } from "./ui/skeleton";
import Link from "next/link";

const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString();
};

const statusConfig: { [key: string]: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } } = {
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Completed', variant: 'default' },
  denied: { label: 'Denied', variant: 'destructive' },
};


export function PurchaseHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<TokenPurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }

    const q = query(
        collection(db, "tokenPurchaseRequests"), 
        where("userId", "==", user.id)
        // orderBy("createdAt", "desc") - This would require a composite index.
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TokenPurchaseRequest));
        
        // Sort on the client-side to avoid needing the index
        historyData.sort((a, b) => {
            const timeA = a.createdAt?.toDate()?.getTime() || 0;
            const timeB = b.createdAt?.toDate()?.getTime() || 0;
            return timeB - timeA;
        });

        setHistory(historyData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching purchase history: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase History</CardTitle>
        <CardDescription>A record of all your token purchase requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Transaction</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-12" /></TableCell>
                        </TableRow>
                    ))
                ) : history.length > 0 ? (
                    history.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{formatDate(item.createdAt)}</TableCell>
                            <TableCell>{item.amount.toFixed(2)} {siteConfig.token.symbol}</TableCell>
                            <TableCell>
                                <Badge variant={statusConfig[item.status]?.variant || 'secondary'}>
                                    {statusConfig[item.status]?.label || item.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {item.transactionSignature ? (
                                    <Link href={`https://explorer.solana.com/tx/${item.transactionSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-end gap-1 text-sm underline hover:text-primary">
                                        View <ExternalLink className="h-3 w-3" />
                                    </Link>
                                ) : (
                                    '-'
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                            <ShoppingCart className="mx-auto h-8 w-8 mb-2"/>
                            Your purchase history is empty.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
