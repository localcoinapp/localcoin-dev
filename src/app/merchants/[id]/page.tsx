'use client'

import { useState, useEffect } from 'react';
import { Star, MessageSquare, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { notFound, useParams } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import type { Merchant, MerchantItem } from '@/types';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function MerchantProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  console.log({ user, authLoading }); // Add this line here

  useEffect(() => {
    if (!id) return;

    const merchantDocRef = doc(db, 'merchants', id);
    const unsubscribe = onSnapshot(merchantDocRef, (doc) => {
      if (doc.exists()) {
        setMerchant({
          id: doc.id,
          ...doc.data(),
          listings: doc.data()?.listings || [] // Use 'listings' field
        } as Merchant);
      } else {
        notFound();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="overflow-hidden shadow-2xl">
          <Skeleton className="h-64 w-full" />
          <CardContent className="p-6">
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-12 w-2/3 mb-4" />
            <div className="mt-8">
              <Skeleton className="h-10 w-1/4 mb-4" />
              <Skeleton className="h-48 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!merchant) {
    // This will be caught by notFound() in the fetch logic, but as a fallback:
    notFound();
  }

  const handleAddToCart = async (item: MerchantItem) => {
    console.log("handleAddToCart called");
    if (!user || !user.id) { // Use user.id based on our previous debugging
        console.error("User not authenticated or user ID not available.");
        return; // Exit if user or user.uid is not available
    }

    const userDocRef = doc(db, 'users', user.id); // Use user.id for user document

    const cartItem = {
        orderId: Date.now().toString(), // Simple way to generate a unique ID (consider a more robust method)
        title: item.name,
        price: item.price,
        quantity: 1, // Assuming adding one item at a time
        merchantId: merchant?.id, // Use the merchant\'s ID from the state
        merchantName: merchant?.companyName, // Use the merchant\'s name from the state
        redeemCode: null, // Initially null
        status: 'pending_approval', // Initial status
        timestamp: new Date(), // Add a timestamp
    };

    // Data structure for the merchant's pending order
    const pendingOrderForMerchant = {
        orderId: cartItem.orderId, // Use the same orderId
        userId: user.id, // Include user ID
        userName: user.name, // Include user name
        item: { // Include item details
            id: item.id,
            name: item.name,
            price: item.price,
            // Add other item details as needed
        },
        quantity: cartItem.quantity,
        status: 'pending_approval',
        timestamp: cartItem.timestamp,
        // Add other relevant fields like user contact info if necessary
    };

    // Logic to decrement merchant inventory
    const merchantDocRef = doc(db, 'merchants', merchant.id); // Reference to merchant document

    try {
        // Fetch the current merchant data to get the listings array
        const merchantDoc = await getDoc(merchantDocRef);
        if (!merchantDoc.exists()) {
            console.error("Merchant document not found!");
            toast({
                title: "Error",
                description: "Could not update merchant inventory. Merchant data not found.",
                variant: "destructive"
            });
            return;
        }
        const merchantData = merchantDoc.data();
        let updatedListings = merchantData.listings || [];

        // Find the item in the listings and decrement quantity
        updatedListings = updatedListings.map((listing: MerchantItem) => {
            if (listing.id === item.id) {
                return {
                    ...listing,
                    quantity: listing.quantity - cartItem.quantity, // Decrement quantity
                };
            }
            return listing;
        });

        await updateDoc(userDocRef, {
            cart: arrayUnion(cartItem)
        });
    } catch (error) {
        console.error("Error adding item to cart:", error);
        toast({
            title: "Error",
            description: "There was an error adding the item to your cart. Please try again.",
            variant: "destructive"
        });
    }

    try {
        // Update merchant's pending orders and listings
        await updateDoc(merchantDocRef, {
            pendingOrders: arrayUnion(pendingOrderForMerchant), // Add to pendingOrders array
            listings: updatedListings, // Update the listings array
        });
        console.log(`Added pending order ${cartItem.orderId} and updated inventory for merchant ${merchant.companyName} in Firestore`);

        toast({
            title: "Added to Cart",
            description: `${item.name} has been added to your cart. The merchant will review your request.`,
        });
    } catch (error) {
        console.error("Error updating merchant pending orders or inventory:", error); // Log the error
        toast({
            title: "Error",
            description: "There was an error updating merchant data. Please try again.",
            variant: "destructive"
        });
    }
};

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="p-0">
          <div className="relative h-64 w-full">
            {merchant.imageUrl ? (
               <Image
                 src={merchant.imageUrl}
                 alt={merchant.companyName}
                 fill
                 className="object-cover"
                 data-ai-hint={merchant.aiHint}
               />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                No Image Available
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
              <Badge variant="secondary" className="mb-2">{merchant.category}</Badge>
              <CardTitle className="text-4xl font-bold font-headline">{merchant.companyName}</CardTitle>
              <CardDescription className="mt-2 text-lg">{merchant.description}</CardDescription>
            </div>
            <div className="flex-shrink-0 flex flex-col items-start md:items-end gap-2">
              <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                <Star className="w-6 h-6 text-yellow-400 fill-current" />
                <span className="font-bold text-2xl">{merchant.rating}</span>
              </div>
              <Link href={`/chat/${merchant.id}`} passHref>
                <Button size="lg">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Chat with Merchant
                </Button>
              </Link>
            </div>
          </div>

 {user && (
 <div className="mt-8">
 <h2 className="text-2xl font-bold font-headline mb-4">Offerings</h2>
 <Card>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Item</TableHead>
 <TableHead>Category</TableHead>
 <TableHead>Price</TableHead>
 <TableHead className="text-right">Action</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {(merchant.listings || []).filter(item => item.active).map((item: MerchantItem) => (
 <TableRow key={item.id} className={cn(item.quantity === 0 && 'text-muted-foreground', !item.active && 'hidden')}>
 <TableCell className="font-medium">{item.name}</TableCell>
 <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
 <TableCell>{item.price.toFixed(2)} {siteConfig.token.symbol}</TableCell>
 <TableCell className="text-right">
 {item.quantity > 0 ? (
 <Button size="sm" onClick={() => handleAddToCart(item)}>
 <ShoppingCart className="mr-2 h-4 w-4" />
 Add to Cart
 </Button>
 ) : (
 <Badge variant="destructive">Sold Out</Badge>
 )}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </Card>
 </div>
 )}
        </CardContent>
      </Card>
    </div>
  );
}
