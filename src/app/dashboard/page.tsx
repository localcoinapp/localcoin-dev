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
  CheckCircle,
  Edit,
  Trash2
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
  arrayUnion,
} from "firebase/firestore";

import { Switch } from "@/components/ui/switch";
import EditListingModal from '@/components/dashboard/edit-listing-modal';

export default function DashboardPage() {
  const { user } = useAuth();
  const [merchantData, setMerchantData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<any>(null);

  useEffect(() => {
    if (user && (user.role === 'merchant' || user.role === 'admin') && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (doc) => {
        if (doc.exists()) {
          setMerchantData({
            ...doc.data(),
            listings: doc.data()?.listings || [],
            incomingOrders: doc.data()?.incomingOrders || [],
            approvedRedemptions: doc.data()?.approvedRedemptions || [],
            recentTransactions: doc.data()?.recentTransactions || [],
          });
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
        // User is logged in but not a merchant
        setIsLoading(false);
        setMerchantData(null);
    }
  }, [user]);

  const handleListingStatusChange = async (listing: any) => {
    if (!user || !user.merchantId) return;
    const listingRef = doc(db, "merchants", user.merchantId);
    const updatedListing = { ...listing, active: !listing.active };
    try {
        await updateDoc(listingRef, { listings: arrayRemove(listing) });
        await updateDoc(listingRef, { listings: arrayUnion(updatedListing) });
    } catch (error) {
        console.error("Error updating listing status:", error);
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
    } catch (error) {
      console.error("Error deleting listing:", error);
    } finally {
      setIsDeleteConfirmOpen(false);
      setListingToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || !merchantData) {
       return (
         <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
           <Card className="w-full max-w-lg text-center">
               <CardHeader>
                   <CardTitle>Become a Merchant</CardTitle>
                   <CardDescription>You are not a merchant yet. Apply to start selling your own services on the marketplace.</CardDescription>
               </CardHeader>
               <CardContent>
                   <Link href="/dashboard/become-merchant">
                       <Button>
                           Get Started <ArrowRight className="ml-2 h-4 w-4" />
                       </Button>
                   </Link>
               </CardContent>
           </Card>
         </div>
       );
  }

  // If we've passed the checks above, we are a merchant with data.
  // The final return is now unconditional.
  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline">Merchant Dashboard</h1>
            <p className="text-muted-foreground">Manage your store, wallet, and listings.</p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Link href="/dashboard/add-listing" passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Listing
              </Button>
            </Link>
            <Link href="/dashboard/settings" passHref>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Store Settings
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{merchantData.merchantWalletBalance?.toFixed(2) || '0.00'} {siteConfig.token.symbol}</div>
              <p className="text-xs text-muted-foreground">
                ~ ${merchantData.merchantWalletBalance?.toFixed(2) || '0.00'} USD
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{merchantData.listings?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Items and services
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{merchantData.incomingOrders?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                New requests to approve
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-8">
              {/* Incoming Orders Table */}
              <Card>
                <CardHeader>
                    <CardTitle>Incoming Orders</CardTitle>
                    <CardDescription>Review and approve new requests from customers.</CardDescription>
                </CardHeader>
                <CardContent>
                    {merchantData.incomingOrders?.length > 0 ? (
                        <p>Incoming orders table here.</p> // Placeholder
                    ) : (
                        <p className="text-muted-foreground text-center p-4">No pending orders.</p>
                    )}
                </CardContent>
              </Card>
          </div>
          <div className="lg:col-span-1">
              {/* Your Listings Table */}
              <Card>
              <CardHeader>
                <CardTitle>Your Listings</CardTitle>
                <CardDescription>Manage your items and services.</CardDescription>
              </CardHeader>
              <CardContent>
              {merchantData.listings?.length > 0 ? (
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Inventory</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchantData.listings.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            {item.quantity > 0 ? item.quantity : <Badge variant="destructive">Sold Out</Badge>}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={item.active}
                              onCheckedChange={() => handleListingStatusChange(item)}
                              disabled={item.quantity === 0}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditListing(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                 ) : (
                    <p className="text-muted-foreground text-center p-4">No listings found.</p>
                 )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the listing "{listingToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setListingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingListing && (
        <EditListingModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          listing={editingListing}
          merchantId={user?.merchantId}
        />
      )}
    </>
  );
}
