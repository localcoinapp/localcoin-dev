

'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  DollarSign,
  ShoppingBag,
  Clock,
  ArrowRight,
  Settings,
  Check,
  X,
  History,
  Edit,
  Trash2,
  KeyRound,
  Loader2,
  Eye,
  Briefcase,
  ShieldAlert,
  Power,
  PowerOff,
  Rocket,
  CheckCircle2,
  Circle,
  ArrowDown,
  TrendingUp,
  Wallet,
  Receipt,
  FileText,
  Upload,
  Download,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayRemove,
  runTransaction,
  setDoc,
  collection,
  query,
  where,
  Timestamp,
  arrayUnion
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import EditListingModal from '@/components/dashboard/edit-listing-modal';
import { RedeemModal } from "@/components/RedeemModal";
import type { MerchantItem, CartItem, MerchantStatus, Merchant, MerchantCashoutRequest } from "@/types";
import { Alert, AlertDescription as AlertDescriptionComponent } from "@/components/ui/alert";
import * as bip39 from "bip39";
import { Keypair, Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { CashoutDialog } from "@/components/wallet/cashout-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isWithinInterval, startOfToday, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfToday, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';
import { Separator } from "@/components/ui/separator";


// --- Helper function to find and update inventory ---
const updateInventory = (listings: MerchantItem[], itemId: string, quantityChange: number): MerchantItem[] => {
    const listingIndex = listings.findIndex(item => item.id === itemId);

    if (listingIndex > -1) {
        const updatedListings = [...listings];
        const updatedItem = { ...updatedListings[listingIndex] };
        updatedItem.quantity = (updatedItem.quantity || 0) + quantityChange;
        updatedListings[listingIndex] = updatedItem;
        return updatedListings;
    }
    return listings;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [merchantData, setMerchantData] = useState<Merchant | null>(null);
  const [cashoutHistory, setCashoutHistory] = useState<MerchantCashoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<any>(null);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemingOrder, setRedeemingOrder] = useState<any>(null);
  
  const [activeOrders, setActiveOrders] = useState<CartItem[]>([]);

  // Wallet State
  const [isLaunching, setIsLaunching] = useState(false);
  const [isViewingSeed, setIsViewingSeed] = useState(false);
  const [showSeedDialog, setShowSeedDialog] = useState(false);
  const [currentSeedPhrase, setCurrentSeedPhrase] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  
  const [timeframe, setTimeframe] = useState('total');

  // CSV Upload
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);


  // Function to fetch balance
  const fetchBalance = async () => {
    if (merchantData?.walletAddress) {
        setIsBalanceLoading(true);
        try {
            const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
            const walletPublicKey = new PublicKey(merchantData.walletAddress);
            const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);

            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
                mint: tokenMintPublicKey,
            });

            if (tokenAccounts.value.length > 0) {
                const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
                setTokenBalance(accountInfo.tokenAmount.uiAmount || 0);
            } else {
                setTokenBalance(0);
            }
        } catch (error) {
            console.error("Failed to fetch merchant token balance:", error);
            setTokenBalance(0);
            toast({
                title: "Error",
                description: "Could not fetch merchant wallet balance.",
                variant: "destructive"
            });
        } finally {
            setIsBalanceLoading(false);
        }
    } else {
        setIsBalanceLoading(false);
        setTokenBalance(0);
    }
  };
  
  // Effect for initial data load from Firestore
  useEffect(() => {
    if (user && user.role === 'merchant' && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const cashoutQuery = query(collection(db, 'merchantCashoutRequests'), where('merchantId', '==', user.merchantId));

      const unsubscribeMerchant = onSnapshot(merchantDocRef, (doc) => {
        if (doc.exists()) {
          const data = { id: doc.id, ...doc.data() } as Merchant;
          setMerchantData(data);
          const active = (data.pendingOrders || []).filter((order: any) => 
              !['completed', 'rejected', 'cancelled', 'refunded', 'failed'].includes(order.status)
          );
          setActiveOrders(active);
        } else {
          setMerchantData(null);
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching merchant data:", error);
        setIsLoading(false);
      });

      const unsubscribeCashouts = onSnapshot(cashoutQuery, (snapshot) => {
          setCashoutHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MerchantCashoutRequest)));
      });

      return () => {
        unsubscribeMerchant();
        unsubscribeCashouts();
      }
    } else if (user) {
      setIsLoading(false);
      setMerchantData(null);
    }
  }, [user]);

  // Effect to fetch balance when merchantData is available or changes
  useEffect(() => {
      fetchBalance();
  }, [merchantData?.walletAddress]);


  const handleStatusToggle = async (isLive: boolean) => {
    if (!user || !user.merchantId) return;
    const newStatus = isLive ? 'live' : 'paused';
    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    try {
      await updateDoc(merchantDocRef, { status: newStatus });
      toast({ title: `Store is now ${newStatus}`, description: `Your store is now ${newStatus === 'live' ? 'visible in the marketplace' : 'hidden from the marketplace'}.` });
    } catch (error) {
      console.error("Error updating store status:", error);
      toast({ title: "Error", description: "Could not update store status.", variant: "destructive" });
    }
  };

  const handleLaunchStore = async () => {
    if (!user || !user.merchantId) return;
    setIsLaunching(true);

    try {
        const mnemonic = bip39.generateMnemonic();
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const keypair = Keypair.fromSeed(seed.slice(0, 32));
        const walletAddress = keypair.publicKey.toBase58();

        const merchantDocRef = doc(db, "merchants", user.merchantId);
        await updateDoc(merchantDocRef, { 
            status: 'live',
            walletAddress: walletAddress,
            seedPhrase: mnemonic, // Storing unencrypted seed phrase
        });

        setCurrentSeedPhrase(mnemonic);
        setShowSeedDialog(true);
        toast({ title: "Store Launched & Wallet Created!", description: "Your store is now live and your wallet is ready."});
    } catch(e) {
        console.error("Store launch failed", e);
        toast({ title: "Error", description: (e as Error).message, variant: "destructive"});
    } finally {
        setIsLaunching(false);
    }
  }

  const handleViewSeedPhrase = () => {
    if (!merchantData?.seedPhrase) {
        toast({ title: "Error", description: "Seed phrase not found for this merchant.", variant: "destructive"});
        return;
    }
    setCurrentSeedPhrase(merchantData.seedPhrase);
    setShowSeedDialog(true);
  }


  const handleListingStatusChange = async (listing: MerchantItem) => {
    if (!user || !user.merchantId || !merchantData) return;
    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    
    const updatedListings = (merchantData.listings || []).map((item: MerchantItem) => 
        item.id === listing.id ? { ...item, active: !item.active } : item
    );
    
    try {
        await updateDoc(merchantDocRef, { listings: updatedListings });
        toast({ title: "Success", description: "Listing status updated." });
    } catch (error) {
        console.error("Error updating listing status:", error);
        toast({ title: "Error", description: "Could not update listing status.", variant: "destructive" });
    }
  };

  const handleApproveOrder = async (orderId: string, userId: string) => {
    if (!user || !user.merchantId) return;

    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    const userDocRef = doc(db, 'users', userId);

    try {
      await runTransaction(db, async (tx) => {
        const [merchantDoc, userDoc] = await Promise.all([tx.get(merchantDocRef), tx.get(userDocRef)]);
        if (!merchantDoc.exists() || !userDoc.exists()) throw new Error("Document not found.");

        const currentMerchantData = merchantDoc.data();
        const currentUserData = userDoc.data();
        const redeemCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        const updatedPendingOrders = (currentMerchantData.pendingOrders || []).map((order: CartItem) =>
          order.orderId === orderId ? { ...order, status: 'approved', redeemCode } : order
        );

        const updatedUserCart = (currentUserData.cart || []).map((item: CartItem) => 
            item.orderId === orderId ? { ...item, status: 'approved', redeemCode } : item
        );
        
        tx.update(merchantDocRef, { pendingOrders: updatedPendingOrders });
        tx.update(userDocRef, { cart: updatedUserCart });
      });
      
      toast({ title: "Order Approved!", description: "The user has been notified." });
    } catch (error) {
      console.error("Error approving order:", error);
      toast({ title: "Error", description: "Could not approve the order.", variant: "destructive"});
    }
  };

  const handleDenyOrder = async (orderId: string, userId: string, listingId: string, quantity: number) => {
    if (!user || !user.merchantId) return;
  
    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    const userDocRef = doc(db, 'users', userId);
  
    try {
      await runTransaction(db, async (transaction) => {
        const [merchantDoc, userDoc] = await Promise.all([
          transaction.get(merchantDocRef),
          transaction.get(userDocRef)
        ]);
  
        if (!merchantDoc.exists() || !userDoc.exists()) throw new Error("User or Merchant document does not exist!");
  
        const merchantData = merchantDoc.data();
        const userData = userDoc.data();
  
        const orderToDeny = (merchantData.pendingOrders || []).find((o: CartItem) => o.orderId === orderId);

        if (!orderToDeny) throw new Error("Order not found in pending orders.");

        const updatedPendingOrders = (merchantData.pendingOrders || []).filter((o: CartItem) => o.orderId !== orderId);
        const updatedUserCart = (userData.cart || []).map((item: CartItem) =>
            item.orderId === orderId ? { ...item, status: 'rejected' } : item
        );
  
        const updatedListings = updateInventory(
            merchantData.listings || [],
            listingId,
            quantity
        );

        const updatedReserved = (merchantData.reserved || []).filter((r: any) => r.orderId !== orderId);
        const updatedRecentTransactions = arrayUnion({ ...orderToDeny, status: 'rejected' });

        transaction.update(merchantDocRef, {
          pendingOrders: updatedPendingOrders,
          recentTransactions: updatedRecentTransactions,
          listings: updatedListings,
          reserved: updatedReserved
        });
        transaction.update(userDocRef, { cart: updatedUserCart });
      });
  
      toast({ title: "Order Denied", description: "The order was rejected and stock has been returned." });
    } catch (error) {
      console.error("Error denying order:", error);
      toast({ title: "Error Denying Order", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleEditListing = (item: any) => {
    setEditingListing(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setListingToDelete(item);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !user.merchantId || !listingToDelete) return;
    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    try {
      await updateDoc(merchantDocRef, { listings: arrayRemove(listingToDelete) });
      toast({ title: "Listing Deleted", description: `"${listingToDelete.name}" has been removed.`});
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast({ title: "Error", description: "Could not delete the listing.", variant: "destructive"});
    } finally {
      setIsDeleteConfirmOpen(false);
      setListingToDelete(null);
    }
  };

  const handleRedeemOrder = async (order: CartItem) => {
    setIsRedeemModalOpen(false); // Close the modal immediately
    toast({ title: "Processing Redemption...", description: "Please wait while we transfer the tokens." });
  
    try {
      const response = await fetch('/api/merchant/redeem-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.details || 'Failed to redeem order.');
      }
      
      // Manually trigger a balance refresh after successful redemption
      fetchBalance();
  
      toast({
        title: "Order Redeemed!",
        description: `Transaction successful. Signature: ${result.signature.substring(0, 20)}...`,
      });
  
    } catch (error: any) {
      console.error("Error redeeming order:", error);
      toast({
        title: "Redemption Failed",
        description: error.message || "There was a problem completing the redemption.",
        variant: "destructive",
      });
    } finally {
        setRedeemingOrder(null);
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !user.merchantId) return;

    setIsUploadingCsv(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'price', 'category', 'quantity', 'description'];

        if (!requiredHeaders.every(h => headers.includes(h))) {
            toast({
                title: "Invalid CSV format",
                description: "CSV must include headers: name, price, category, quantity, description.",
                variant: "destructive"
            });
            setIsUploadingCsv(false);
            return;
        }

        const newItems: MerchantItem[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
            const data = lines[i].split(',');
            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = data[index]?.trim() || '';
            });

            const price = parseFloat(row.price);
            const quantity = parseInt(row.quantity, 10);

            if (!row.name || isNaN(price) || !row.category || isNaN(quantity)) {
                errors.push(`Skipping invalid data in row ${i + 1}.`);
                continue;
            }

            newItems.push({
                id: `${Date.now()}-${i}`,
                active: true,
                name: row.name,
                price: price,
                category: row.category,
                quantity: quantity,
                description: row.description || '',
            });
        }
        
        if (errors.length > 0) {
            toast({
                title: "Import Warning",
                description: errors.join(' '),
                variant: "destructive"
            })
        }
        
        if (newItems.length > 0 && merchantData) {
            try {
                const merchantRef = doc(db, "merchants", user.merchantId);
                const updatedListings = [...merchantData.listings, ...newItems];
                await updateDoc(merchantRef, { listings: updatedListings });
                toast({
                    title: "Import Successful",
                    description: `Successfully added ${newItems.length} new listings.`
                });
            } catch (error) {
                 toast({
                    title: "Import Failed",
                    description: "An error occurred while saving the new listings.",
                    variant: "destructive"
                });
            }
        }
        
        setIsUploadingCsv(false);
        if (csvInputRef.current) {
            csvInputRef.current.value = ""; // Reset file input
        }
    };
    reader.readAsText(file);
  };


  if (isLoading) {
    return <div className="container text-center"><p>Loading dashboard...</p></div>;
  }

  if (merchantData?.status === 'blocked') {
    return (
       <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
         <Card className="w-full max-w-lg text-center p-8 border-destructive">
          <CardHeader>
            <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-2xl font-headline">Shop Blocked</CardTitle>
            <CardDescription>Your merchant account has been blocked. Please contact support for further information.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user || !merchantData) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-lg text-center p-8">
          <CardHeader>
            <Briefcase className="mx-auto h-12 w-12 text-primary mb-4" />
            <CardTitle className="text-2xl font-headline">Become a Merchant</CardTitle>
            <CardDescription>Start selling your services and items on our platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/become-merchant">
              <Button>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { listings = [], walletAddress, status, logo, banner, description, recentTransactions = [] } = merchantData;
  const isStoreLive = status === 'live';
  
  const hasListings = listings.length > 0;
  const hasLogo = !!logo;
  const hasBanner = !!banner;
  const hasSufficientDescription = (description || '').length >= 100;
  const canLaunch = hasListings && hasLogo && hasBanner && hasSufficientDescription;

  // --- Listing Counts ---
  const totalListingsCount = listings.length;
  const activeListingsCount = listings.filter(l => l.active).length;

  // --- Order Counts ---
  const ordersWaitingForApproval = activeOrders.filter(o => o.status === 'pending_approval').length;
  const ordersWaitingToBeRedeemed = activeOrders.filter(o => ['approved', 'ready_to_redeem'].includes(o.status)).length;
  
  const getTimeframeInterval = (timeframe: string) => {
      const now = new Date();
      switch (timeframe) {
          case 'today': return { start: startOfToday(), end: endOfToday() };
          case 'week': return { start: startOfWeek(now), end: endOfWeek(now) };
          case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
          case 'quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
          case 'year': return { start: startOfYear(now), end: endOfYear(now) };
          default: return null;
      }
  }

  // --- Accounting Calculations ---
  const interval = getTimeframeInterval(timeframe);

  const filteredTransactions = interval
    ? recentTransactions.filter(tx => tx.status === 'completed' && tx.redeemedAt && isWithinInterval(tx.redeemedAt.toDate(), interval))
    : recentTransactions.filter(tx => tx.status === 'completed');

  const filteredCashoutHistory = interval
    ? cashoutHistory.filter(req => req.status === 'approved' && req.processedAt && isWithinInterval(req.processedAt.toDate(), interval))
    : cashoutHistory.filter(req => req.status === 'approved');
  
  const totalEarnings = filteredTransactions.reduce((acc, tx) => acc + tx.price, 0);

  const totalCashedOut = filteredCashoutHistory.reduce((acc, req) => acc + req.amount, 0);
  const netProfit = totalCashedOut * (1 - siteConfig.commissionRate);
  // -----------------------------

  const ChecklistItem = ({ isComplete, children }: { isComplete: boolean; children: React.ReactNode }) => (
    <div className="flex items-center gap-3">
        {isComplete ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
        <span className={cn(isComplete ? 'text-foreground' : 'text-muted-foreground')}>{children}</span>
    </div>
  );

  const renderDashboardHeader = () => {
    if (status === 'live' || status === 'paused') {
        return (
            <Alert className={cn("mb-8", isStoreLive ? "border-green-300 bg-green-50 dark:bg-green-900/20" : "border-amber-300 bg-amber-50 dark:bg-amber-900/20")}>
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isStoreLive ? <Power className="h-5 w-5 text-green-600"/> : <PowerOff className="h-5 w-5 text-amber-600"/>}
                    <div>
                    <AlertDescriptionComponent className={cn("font-semibold", isStoreLive ? "text-green-800 dark:text-green-300" : "text-amber-800 dark:text-amber-300")}>
                        Your store is currently {isStoreLive ? 'Live' : 'Paused'}.
                    </AlertDescriptionComponent>
                    <p className="text-xs text-muted-foreground">{isStoreLive ? "It is visible to customers in the marketplace." : "Customers cannot see your store."}</p>
                    </div>
                </div>
                <Switch
                    checked={isStoreLive}
                    onCheckedChange={(checked) => handleStatusToggle(checked)}
                    aria-label="Toggle store status"
                />
                </div>
            </Alert>
        );
    }

    if (status === 'approved') {
        return (
            <Card className="mb-8 border-primary/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-primary">
                        <Rocket className="h-6 w-6" />
                        You're Approved! Time to Launch.
                    </CardTitle>
                    <CardDescription>
                        Complete the steps below to make your store visible to everyone in the marketplace.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-4 border rounded-lg">
                     <ChecklistItem isComplete={hasLogo}>Upload a store logo</ChecklistItem>
                     <ChecklistItem isComplete={hasBanner}>Upload a banner image</ChecklistItem>
                     <ChecklistItem isComplete={hasSufficientDescription}>Write a description (min. 100 chars)</ChecklistItem>
                     <ChecklistItem isComplete={hasListings}>Add at least one listing</ChecklistItem>
                   </div>
                    <Button 
                        size="lg" 
                        onClick={handleLaunchStore} 
                        disabled={!canLaunch || isLaunching}
                        className="w-full"
                    >
                        {isLaunching ? <Loader2 className="animate-spin mr-2" /> : null}
                        {canLaunch ? 'Launch My Store!' : 'Complete the steps above to launch'}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return null;
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4">
          <h1 className="text-3xl font-bold font-headline">Merchant Dashboard</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/merchants/${merchantData.id}`} passHref>
                <Button><Eye className="mr-2 h-4 w-4" /> View My Site</Button>
            </Link>
            <Link href="/dashboard/add-listing" passHref>
              <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add New Item</Button>
            </Link>
            <input 
                type="file" 
                ref={csvInputRef} 
                className="hidden" 
                accept=".csv" 
                onChange={handleCsvUpload} 
            />
            <Button variant="outline" onClick={() => csvInputRef.current?.click()} disabled={isUploadingCsv}>
                {isUploadingCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import from CSV
            </Button>
             <Button variant="link" asChild className="p-0 h-auto">
                <a href="/inventory_template.csv" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </a>
             </Button>
            <Link href="/dashboard/settings" passHref>
              <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Store Settings</Button>
            </Link>
             <Link href="/dashboard/order-history" passHref>
              <Button variant="outline"><History className="mr-2 h-4 w-4" /> Order History</Button>
            </Link>
             <Link href="/merchant-agreement" passHref>
              <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Merchant Agreement</Button>
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground mb-8">Manage listings, view transactions, and handle incoming orders.</p>
        
        {renderDashboardHeader()}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Listings Overview</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeListingsCount} / {totalListingsCount}</div>
              <p className="text-xs text-muted-foreground">active / total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incoming Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrders.length}</div>
              <div className="space-y-1 text-xs text-muted-foreground mt-2">
                 <p>{ordersWaitingForApproval} waiting for approval</p>
                 <p>{ordersWaitingToBeRedeemed} waiting to be redeemed</p>
              </div>
            </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              {walletAddress ? (
                  <div className="space-y-4">
                      <div className="text-2xl font-bold font-headline">
                         {isBalanceLoading ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                         ) : (
                          `${tokenBalance.toFixed(2)} ${siteConfig.token.symbol}`
                         )}
                      </div>
                       <p className="text-xs text-muted-foreground pt-2 break-all">
                        Address: {walletAddress}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                          <CashoutDialog merchant={merchantData}>
                              <Button variant="outline" size="sm">
                                  <ArrowDown className="mr-2 h-4 w-4" /> Request Cash Out
                              </Button>
                          </CashoutDialog>
                          <Button variant="secondary" size="sm" onClick={handleViewSeedPhrase} disabled={isViewingSeed}>
                              {isViewingSeed ? <Loader2 className="animate-spin mr-2"/> : <Eye className="mr-2 h-4 w-4" />}
                              Show Seed Phrase
                          </Button>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-start gap-4">
                      <p className="text-muted-foreground">You have not created a wallet yet.</p>
                      <Button onClick={handleLaunchStore} disabled={isLaunching || !canLaunch}>
                          {isLaunching ? <Loader2 className="animate-spin mr-2"/> : <KeyRound className="mr-2" />}
                          Create Wallet & Launch
                      </Button>
                  </div>
              )}
              </CardContent>
          </Card>
        </div>

        {(status === 'live' || status === 'paused') && (
            <div className="mb-8">
                <h2 className="text-2xl font-bold font-headline mb-4">Financial Overview</h2>
                <div className="grid gap-6 md:grid-cols-2">
                   <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                           <Select value={timeframe} onValueChange={setTimeframe}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select timeframe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="total">Total</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="week">This Week</SelectItem>
                                    <SelectItem value="month">This Month</SelectItem>
                                    <SelectItem value="quarter">This Quarter</SelectItem>
                                    <SelectItem value="year">This Year</SelectItem>
                                </SelectContent>
                            </Select>
                       </CardHeader>
                       <CardContent className="grid grid-cols-2 items-center">
                           <div className="text-3xl font-bold">{totalEarnings.toFixed(2)} ${siteConfig.token.symbol}</div>
                           <div className="flex h-full items-center justify-center p-2">
                             <Link href="/dashboard/cashout-history" passHref className="w-full">
                                <Button variant="outline" className="w-full">
                                    <History className="mr-2 h-4 w-4" /> View History
                                </Button>
                             </Link>
                           </div>
                       </CardContent>
                   </Card>
                   <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                            <Select value={timeframe} onValueChange={setTimeframe}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select timeframe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="total">Total</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="week">This Week</SelectItem>
                                    <SelectItem value="month">This Month</SelectItem>
                                    <SelectItem value="quarter">This Quarter</SelectItem>
                                    <SelectItem value="year">This Year</SelectItem>
                                </SelectContent>
                            </Select>
                       </CardHeader>
                       <CardContent>
                           <div className="text-3xl font-bold text-green-600">{netProfit.toFixed(2)} {siteConfig.fiatCurrency.symbol}</div>
                           <p className="text-xs text-muted-foreground">
                            After {siteConfig.commissionRate * 100}% platform commission.
                           </p>
                       </CardContent>
                   </Card>
                </div>
            </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Action Required</CardTitle>
                <CardDescription>Review and process new customer requests.</CardDescription>
              </CardHeader>
              <CardContent>
                {activeOrders.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Customer</TableHead><TableHead>Item</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {activeOrders.map((order: CartItem) => (
                        <TableRow key={order.orderId}>
                          <TableCell className="font-mono text-xs">{order.orderId.substring(0, 8)}...</TableCell>
                          <TableCell>{order.userName}</TableCell>
                          <TableCell>{order.title}</TableCell>
                          <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            {order.status === 'pending_approval' && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleApproveOrder(order.orderId, order.userId)}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDenyOrder(order.orderId, order.userId, order.listingId, order.quantity)}><X className="mr-1 h-4 w-4" /> Deny</Button>
                              </div>
                            )}
                            {order.status === 'approved' && <Badge variant="secondary">Awaiting User</Badge>}
                            {order.status === 'ready_to_redeem' && <Button size="sm" onClick={() => { setRedeemingOrder(order); setIsRedeemModalOpen(true); }}>Redeem</Button>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-muted-foreground text-center p-8">No orders require action.</p>}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader><CardTitle>Your Listings</CardTitle><CardDescription>Manage your active items and services.</CardDescription></CardHeader>
              <CardContent>
                {listings.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Stock</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Manage</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {listings.map((item: MerchantItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.quantity > 0 ? item.quantity : <Badge variant="destructive">Sold Out</Badge>}</TableCell>
                          <TableCell><Switch checked={item.active} onCheckedChange={() => handleListingStatusChange(item)} disabled={item.quantity === 0} /></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditListing(item)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(item)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-muted-foreground text-center p-8">No listings found.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{listingToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setListingToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingListing && <EditListingModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} listing={editingListing} merchantId={user?.merchantId} />}
      {redeemingOrder && <RedeemModal isOpen={isRedeemModalOpen} onClose={() => setIsRedeemModalOpen(false)} redeemCode={redeemingOrder.redeemCode} onRedeem={() => handleRedeemOrder(redeemingOrder)} />}
    
      <AlertDialog open={showSeedDialog} onOpenChange={setShowSeedDialog}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Your Secret Seed Phrase</AlertDialogTitle>
                  <AlertDialogDescription>
                      This is the ONLY way to recover your wallet. Store it securely and do not share it with anyone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <Alert variant="destructive" className="text-center">
                  <AlertDescriptionComponent className="font-mono p-4 bg-primary/10 rounded-md">
                    {currentSeedPhrase}
                  </AlertDescriptionComponent>
              </Alert>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => { navigator.clipboard.writeText(currentSeedPhrase || ''); toast({ title: 'Copied!' }); }}>Copy Phrase</AlertDialogAction>
                  <AlertDialogCancel onClick={() => { setCurrentSeedPhrase(null); setShowSeedDialog(false); }}>I've saved it</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
