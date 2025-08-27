
'use client'

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, ArrowRight, Briefcase, CheckCircle2, Circle, Eye, History, Loader2, PlusCircle, Power, PowerOff, Rocket, Settings } from "lucide-react"
import { countries } from "@/data/countries"
import { states } from "@/data/states"
import { provinces } from "@/data/provinces"
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, where, query, onSnapshot, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { geohashForLocation } from "geofire-common";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription as AlertDescriptionComponent } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import EditListingModal from '@/components/dashboard/edit-listing-modal';

import type { MerchantItem, Merchant, CartItem, MerchantStatus } from "@/types";

const formSchema = z.object({
  companyName: z.string().min(2, { message: "Please enter a company name." }),
  country: z.string().min(1, { message: "Please select a country." }),
  street: z.string().min(3, { message: "Please enter a street name." }),
  houseNumber: z.string().min(1, { message: "Please enter a house number." }),
  city: z.string().min(2, { message: "Please enter a city." }),
  state: z.string().optional(),
  zipCode: z.string().min(3, { message: "Please enter a ZIP or postal code." }),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  website: z.string().url().optional().or(z.literal('')),
  instagram: z.string().optional(),
  description: z.string().min(20, { message: "Description must be at least 20 characters." }),
  terms: z.boolean().refine(v => v === true, {
    message: "You must accept the Merchant Agreement to continue.",
  }),
}).refine(data => {
  if (data.country === 'US') {
    const usPhoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    return usPhoneRegex.test(data.phone);
  }
  return true;
}, {
  message: "Please enter a valid US phone number format (e.g., (123) 456-7890).",
  path: ["phone"],
});

type Position = { lat: number; lng: number };

async function geocodeAddressOSM({
  street,
  houseNumber,
  city,
  zipCode,
  country,
}: {
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  country: string;
}): Promise<Position | null> {
  const query = `${houseNumber} ${street}, ${zipCode} ${city}, ${country}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=1&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "LocalCoin/1.0 (fresh@katari.farm)",
      "Accept": "application/json",
    },
  });

  if (!res.ok) throw new Error("Geocoding API request failed");

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [merchantData, setMerchantData] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<any>(null);
  
  const [activeOrders, setActiveOrders] = useState<CartItem[]>([]);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to be ready
    if (!user) {
        router.push('/login');
        return;
    }

    if (user.role === 'merchant' && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Merchant;
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
      return () => unsubscribe();
    } else {
        // User is not a merchant, or doesn't have a merchantId
        setMerchantData(null);
        setIsLoading(false);
    }
  }, [user, authLoading, router]);


  const handleStatusToggle = async (isLive: boolean) => {
    if (!user || !user.merchantId) return;
    const newStatus = isLive ? 'live' : 'paused';
    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    try {
      await updateDoc(merchantDocRef, { status: newStatus });
      toast({ title: `Store is now ${newStatus}`, description: `Your store is now ${newStatus === 'live' ? 'visible in the marketplace' : 'hidden from the marketplace'}.` });
    } catch (error) {
      toast({ title: "Error", description: "Could not update store status.", variant: "destructive" });
    }
  };

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
      toast({ title: "Error", description: "Could not update listing status.", variant: "destructive" });
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
      toast({ title: "Listing Deleted", description: `"${listingToDelete.name}" has been removed.` });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete the listing.", variant: "destructive" });
    } finally {
      setIsDeleteConfirmOpen(false);
      setListingToDelete(null);
    }
  };
  
   if (isLoading || authLoading) {
    return <div className="container text-center p-8"><Loader2 className="h-12 w-12 animate-spin mx-auto" /></div>;
  }
  
  if (!merchantData) {
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

  const { listings = [], status, logo, banner, description } = merchantData;
  const isStoreLive = status === 'live';

  const ChecklistItem = ({ isComplete, children }: { isComplete: boolean; children: React.ReactNode }) => (
    <div className="flex items-center gap-3">
      {isComplete ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
      <span className={!isComplete ? 'text-muted-foreground' : ''}>{children}</span>
    </div>
  );

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
            <Link href="/dashboard/settings" passHref>
              <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Store Settings</Button>
            </Link>
            <Link href="/dashboard/order-history" passHref>
              <Button variant="outline"><History className="mr-2 h-4 w-4" /> Order History</Button>
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground mb-8">Manage listings, view transactions, and handle incoming orders.</p>

        {status === 'live' || status === 'paused' ? (
             <Alert className={isStoreLive ? "mb-8 border-green-300 bg-green-50 dark:bg-green-900/20" : "mb-8 border-amber-300 bg-amber-50 dark:bg-amber-900/20"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   {isStoreLive ? <Power className="h-5 w-5 text-green-600" /> : <PowerOff className="h-5 w-5 text-amber-600" />}
                   <div>
                      <AlertDescriptionComponent className={isStoreLive ? "font-semibold text-green-800 dark:text-green-300" : "font-semibold text-amber-800 dark:text-amber-300"}>
                          Your store is currently {isStoreLive ? 'Live' : 'Paused'}.
                      </AlertDescriptionComponent>
                      <p className="text-xs text-muted-foreground">{isStoreLive ? "It is visible to customers." : "Customers cannot see your store."}</p>
                   </div>
                </div>
                 <Switch
                    checked={isStoreLive}
                    onCheckedChange={(checked) => handleStatusToggle(checked)}
                    aria-label="Toggle store status"
                 />
              </div>
            </Alert>
        ) : null}

        <div className="lg:col-span-2 grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Your Listings</CardTitle>
              <CardDescription>Manage your active items and services.</CardDescription>
            </CardHeader>
            <CardContent>
              {listings.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Stock</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Manage</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {listings.map((item: MerchantItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.quantity > 0 ? item.quantity : <Badge variant="destructive">Sold Out</Badge>}</TableCell>
                        <TableCell><Switch checked={item.active} onCheckedChange={() => handleListingStatusChange(item)} /></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditListing(item)}>Edit</Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(item)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-muted-foreground text-center p-8">No listings found. Click "Add New Item" to get started.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      
       {/* Modals & Dialogs */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{listingToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setListingToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingListing && user?.merchantId && (
        <EditListingModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          listing={editingListing}
          merchantId={user.merchantId}
        />
      )}
    </>
  );
}
