
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
import { ArrowLeft, History, ExternalLink, Receipt, Download, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, Timestamp, collection, query, where } from "firebase/firestore";
import type { MerchantCashoutRequest } from "@/types";
import { siteConfig } from "@/config/site";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -90),
    to: new Date(),
  });

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
    .filter(req => {
      const reqDate = req.createdAt?.toDate();
      if (!reqDate) return false;
      const isInDateRange = (!date?.from || reqDate >= date.from) && (!date?.to || reqDate <= date.to);
      const hasStatus = statusFilter === 'all' || req.status === statusFilter;
      return isInDateRange && hasStatus;
    })
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

  const handleExport = () => {
    const headers = [
      "Requested Date",
      "Processed Date",
      `Amount (${siteConfig.token.symbol})`,
      `Commission (${siteConfig.fiatCurrency.symbol})`,
      `Payout (${siteConfig.fiatCurrency.symbol})`,
      "Status",
      "Transaction ID"
    ];

    const formatCsvDate = (timestamp: Timestamp | Date | undefined) => {
        if (!timestamp) return 'N/A';
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
        // Format to "YYYY-MM-DD" or similar non-comma format.
        return format(date, "MMM dd yyyy"); 
    };

    const rows = filteredAndSortedHistory.map(req => {
      const fiatPayout = req.status === 'approved' ? req.amount * (1 - siteConfig.commissionRate) : 0;
      const commission = req.status === 'approved' ? req.amount * siteConfig.commissionRate : 0;
      
      return [
        formatCsvDate(req.createdAt),
        formatCsvDate(req.processedAt),
        req.amount.toFixed(2),
        commission.toFixed(2),
        fiatPayout.toFixed(2),
        req.status,
        req.transactionSignature || 'N/A'
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cashout-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


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
        <CardHeader className="flex-wrap items-center justify-between gap-4 md:flex-row">
            <div className="flex-grow">
                <CardTitle>Request Log</CardTitle>
                <CardDescription>Browse through your historical cash-out data.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(date.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <SelectTrigger className="w-full sm:w-[160px]">
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
                    <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date-desc">Newest First</SelectItem>
                        <SelectItem value="date-asc">Oldest First</SelectItem>
                        <SelectItem value="amount-asc">Amount (Low-High)</SelectItem>
                        <SelectItem value="amount-desc">Amount (High-Low)</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleExport} disabled={filteredAndSortedHistory.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fiat Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead className="text-right">Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedHistory.map((req) => {
                  const fiatPayout = req.amount * (1 - siteConfig.commissionRate);
                  return (
                    <TableRow key={req.id}>
                      <TableCell>{formatDate(req.createdAt)}</TableCell>
                      <TableCell>{req.amount.toFixed(2)} {siteConfig.token.symbol}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        {req.status === 'approved' ? `${fiatPayout.toFixed(2)} ${siteConfig.fiatCurrency.symbol}`: 'N/A'}
                      </TableCell>
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
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground p-8">
              <Receipt className="mx-auto h-12 w-12 mb-4" />
              <p>No cash-out requests found for the selected criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
