
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
  PowerOff
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
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import EditListingModal from '@/components/dashboard/edit-listing-modal';
import { RedeemModal } from "@/components/RedeemModal";
import type { MerchantItem, CartItem, MerchantStoreStatus } from "@/types";
import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import { Alert, AlertDescription as AlertDescriptionComponent } from "@/components/ui/alert";


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
    // This function should only be used when we are sure the listing exists.
    // We are not creating new listings from here to prevent duplication bugs.
    return listings;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [merchantData, setMerchantData] = useState<any>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<any>(null);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemingOrder, setRedeemingOrder] = useState<any>(null);
  
  const [activeOrders, setActiveOrders] = useState<CartItem[]>([]);

  // Wallet State
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [newSeedPhrase, setNewSeedPhrase] = useState<string | null>(null);


  useEffect(() => {
    if (user && user.role === 'merchant' && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setMerchantData(data);
          setIsBlocked(data.status === 'blocked');
          const active = (data.pendingOrders || []).filter((order: any) => 
              !['completed', 'rejected', 'cancelled'].includes(order.status)
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
      return () => unsubscribe();
    } else if (user) {
      setIsLoading(false);
      setMerchantData(null);
    }
  }, [user]);

  const handleCreateWallet = async () => {
    if (!user || !user.merchantId) return;
    setIsCreatingWallet(true);
    try {
        const mnemonic = bip39.generateMnemonic();
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const keypair = Keypair.fromSeed(seed.slice(0, 32));
        const address = keypair.publicKey.toBase58();

        const merchantDocRef = doc(db, "merchants", user.merchantId);
        // In a real app, this should be encrypted before storing
        await setDoc(merchantDocRef, { walletAddress: address, seedPhrase: mnemonic }, { merge: true });

        setNewSeedPhrase(mnemonic);
        toast({ title: "Wallet Created!", description: "Your new Solana wallet is ready."});
    } catch(e) {
        console.error("Wallet creation failed", e);
        toast({ title: "Error", description: "Failed to create a new wallet.", variant: "destructive"});
    } finally {
        setIsCreatingWallet(false);
    }
  }

  const handleStoreStatusChange = async (newStatus: MerchantStoreStatus) => {
    if (!user || !user.merchantId) return;
    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    try {
      await updateDoc(merchantDocRef, { storeStatus: newStatus });
      toast({ title: `Store is now ${newStatus}`, description: `Your store is now ${newStatus === 'live' ? 'visible in the marketplace' : 'hidden from the marketplace'}.` });
    } catch (error) {
      console.error("Error updating store status:", error);
      toast({ title: "Error", description: "Could not update store status.", variant: "destructive" });
    }
  };

  const handleListingStatusChange = async (listing: MerchantItem) => {
    if (!user || !user.merchantId) return;
    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    
    // Create a new array with the updated item
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

        // Update merchant's pending orders
        const updatedPendingOrders = (currentMerchantData.pendingOrders || []).map((order: CartItem) =>
          order.orderId === orderId ? { ...order, status: 'approved', redeemCode } : order
        );

        // Update user's cart
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

  const handleDenyOrder = async (orderId: string, userId: string) => {
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
        if (!orderToDeny) throw new Error("Order not found.");
  
        // --- Update Status ---
        const updatedPendingOrders = merchantData.pendingOrders.map((o: CartItem) => 
            o.orderId === orderId ? { ...o, status: 'rejected' } : o
        );
        const updatedUserCart = (userData.cart || []).map((item: CartItem) =>
            item.orderId === orderId ? { ...item, status: 'rejected' } : item
        );
  
        // --- Return stock to listings (THE FIX) ---
        // This ensures we ONLY update the quantity of an existing item.
        const updatedListings = updateInventory(
            merchantData.listings || [],
            orderToDeny.listingId,
            orderToDeny.quantity
        );

        // --- Remove from reserved ---
        const updatedReserved = (merchantData.reserved || []).filter((r: any) => r.orderId !== orderId);
  
        // --- Commit all updates ---
        transaction.update(merchantDocRef, {
          pendingOrders: updatedPendingOrders,
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

  const handleRedeemOrder = async (order: any) => {
    if (!user || !user.merchantId || !order || !order.userId) {
      toast({ title: "Error", description: "Could not redeem order due to missing data.", variant: "destructive" });
      return;
    }

    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    const userDocRef = doc(db, 'users', order.userId);

    try {
      await runTransaction(db, async (transaction) => {
        const merchantDoc = await transaction.get(merchantDocRef);
        const userDoc = await transaction.get(userDocRef);

        if (!merchantDoc.exists() || !userDoc.exists()) throw new Error("User or Merchant document does not exist!");
        
        const merchantData = merchantDoc.data();
        const userData = userDoc.data();

        const orderToRedeem = (merchantData.pendingOrders || []).find((o: CartItem) => o.orderId === order.orderId);
        if (!orderToRedeem) return; // Already processed

        // --- Wallet Balance Transfer ---
        // This is now handled on-chain. We remove the Firestore balance updates.
        // --- End Wallet Balance Transfer ---


        // --- Update status to completed ---
        const completedOrder = { ...orderToRedeem, status: 'completed', redeemedAt: new Date() };

        const updatedPendingOrders = merchantData.pendingOrders.map((o: CartItem) => 
            o.orderId === order.orderId ? completedOrder : o
        );
        const updatedUserCart = (userData.cart || []).map((cartItem: CartItem) =>
            cartItem.orderId === order.orderId ? completedOrder : cartItem
        );
        
        // --- Remove from reserved, add to transactions ---
        const updatedReserved = (merchantData.reserved || []).filter((r: any) => r.orderId !== order.orderId);
        const updatedTransactions = [...(merchantData.recentTransactions || []), completedOrder];

        transaction.update(merchantDocRef, {
          pendingOrders: updatedPendingOrders,
          recentTransactions: updatedTransactions,
          reserved: updatedReserved,
        });
        transaction.update(userDocRef, { 
            cart: updatedUserCart,
        });
      });

      toast({ title: "Order Redeemed!", description: "The transaction has been successfully completed." });
      setIsRedeemModalOpen(false);
      setRedeemingOrder(null);

    } catch (error: any) {
      console.error("Error redeeming order:", error);
      const errorMessage = "There was a problem completing the redemption.";
      toast({ title: "Redemption Failed", description: errorMessage, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="container text-center"><p>Loading dashboard...</p></div>;
  }

  if (isBlocked) {
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
  
  const { listings = [], walletAddress, seedPhrase, storeStatus } = merchantData;
  const isStoreLive = storeStatus === 'live';

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4">
          <h1 className="text-3xl font-bold font-headline">Merchant Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/add-listing" passHref>
              <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add New Item</Button>
            </Link>
            <Link href="/dashboard/settings" passHref>
              <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Store Settings</Button>
            </Link>
             <Link href="/dashboard/order-history" passHref>
              <Button variant="outline"><History className="mr-2 h-4 w-4" /> Order History</Button>
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground mb-8">Manage listings, view transactions, and handle incoming orders.</p>

        <Alert className={cn("mb-8", isStoreLive ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isStoreLive ? <Power className="h-5 w-5 text-green-600"/> : <PowerOff className="h-5 w-5 text-amber-600"/>}
              <div>
                <AlertDescriptionComponent className={cn("font-semibold", isStoreLive ? "text-green-800" : "text-amber-800")}>
                  Your store is currently {isStoreLive ? 'Live' : 'Paused'}.
                </AlertDescriptionComponent>
                <p className="text-xs text-muted-foreground">{isStoreLive ? "It is visible to customers in the marketplace." : "Customers cannot see your store."}</p>
              </div>
            </div>
            <Switch
              checked={isStoreLive}
              onCheckedChange={(checked) => handleStoreStatusChange(checked ? 'live' : 'paused')}
              aria-label="Toggle store status"
            />
          </div>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {walletAddress ? (
                  <div className="space-y-4">
                      <div className="text-2xl font-bold font-headline">0.00 SOL</div>
                      <p className="text-xs text-muted-foreground pt-2 break-all">
                        Address: {walletAddress}
                      </p>
                       <div className="flex gap-2 mt-4">
                          <Button variant="secondary" size="sm" onClick={() => setShowSeedPhrase(true)}>
                              <Eye className="mr-2" /> Show Seed Phrase
                          </Button>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-start gap-4">
                      <p className="text-muted-foreground">You have not created a wallet yet.</p>
                      <Button onClick={handleCreateWallet} disabled={isCreatingWallet}>
                          {isCreatingWallet ? <Loader2 className="animate-spin mr-2"/> : <KeyRound className="mr-2" />}
                          Create Wallet
                      </Button>
                  </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{listings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incoming Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrders.length}</div>
            </CardContent>
          </Card>
        </div>

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
                          <TableCell>{order.name}</TableCell>
                          <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            {order.status === 'pending_approval' && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleApproveOrder(order.orderId, order.userId)}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDenyOrder(order.orderId, order.userId)}><X className="mr-1 h-4 w-4" /> Deny</Button>
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
    
      {/* Dialog for displaying NEWLY created seed phrase */}
      <AlertDialog open={!!newSeedPhrase} onOpenChange={() => setNewSeedPhrase(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Wallet Created Successfully!</AlertDialogTitle>
                  <AlertDialogDescription>
                      Please save this seed phrase in a secure location. It is the ONLY way to recover your wallet.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <Alert variant="destructive" className="text-center">
                  <AlertDescriptionComponent className="font-mono p-4 bg-primary/10 rounded-md">
                    {newSeedPhrase}
                  </AlertDescriptionComponent>
              </Alert>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => { navigator.clipboard.writeText(newSeedPhrase || ''); toast({ title: 'Copied!' }); }}>Copy Phrase</AlertDialogAction>
                  <AlertDialogCancel onClick={() => setNewSeedPhrase(null)}>I've saved it</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for showing EXISTING seed phrase */}
      <AlertDialog open={showSeedPhrase} onOpenChange={setShowSeedPhrase}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Your Secret Seed Phrase</AlertDialogTitle>
                  <AlertDialogDescription>
                    Do not share this with anyone! Anyone with this phrase can take your assets.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <Alert variant="destructive" className="text-center">
                  <AlertDescriptionComponent className="font-mono p-4 bg-primary/10 rounded-md">
                    {seedPhrase || "No seed phrase found."}
                  </AlertDescriptionComponent>
              </Alert>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => { navigator.clipboard.writeText(seedPhrase || ''); toast({ title: 'Copied!' }); }}>Copy Phrase</AlertDialogAction>
                  <AlertDialogCancel onClick={() => setShowSeedPhrase(false)}>Close</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
