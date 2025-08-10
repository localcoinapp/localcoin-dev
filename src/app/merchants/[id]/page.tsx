
'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, getDoc, runTransaction, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Merchant, MerchantItem, CartItem, ChatParticipant, User } from '@/types';
import { Globe, Instagram, MapPin, MessageSquare, Loader2, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface Listing extends MerchantItem {
  title?: string; 
}

export default function MerchantPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const merchantId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (merchantId) {
      const merchantDocRef = doc(db, 'merchants', merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const merchantData = { id: snapshot.id, ...snapshot.data() } as Merchant;
          setMerchant(merchantData);
          if (merchantData.listings) {
            setListings(merchantData.listings.filter(l => l.active));
          } else {
            setListings([]);
          }
        } else {
          setMerchant(null);
          setListings([]);
        }
        setLoading(false);
      }, (err) => {
        console.error("Error loading merchant document:", err);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [merchantId]);

  const handleAddToCart = async (item: MerchantItem) => {
    if (!user || !merchantId) return;

    setAddingToCart(item.id);

    const userDocRef = doc(db, 'users', user.id);
    const merchantDocRef = doc(db, 'merchants', merchantId);

    try {
        await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userDocRef);
            const merchantSnap = await transaction.get(merchantDocRef);

            if (!userSnap.exists()) throw new Error("User not found");
            if (!merchantSnap.exists()) throw new Error("Merchant not found");
            
            const merchantData = merchantSnap.data() as Merchant;
            const currentListings = merchantData.listings || [];
            const listingIndex = currentListings.findIndex(l => l.id === item.id);

            if (listingIndex === -1) throw new Error("Item not found");
            if (currentListings[listingIndex].quantity <= 0) throw new Error("Item is out of stock");

            // Decrement quantity
            currentListings[listingIndex].quantity -= 1;
            
            const orderId = `order_${user.id}_${item.id}_${Date.now()}`;
            
            // Create new cart item
            const newCartItem: CartItem = {
              orderId,
              title: item.name,
              itemId: item.id,
              listingId: item.id,
              price: item.price,
              quantity: 1,
              merchantId: merchant!.id,
              merchantName: merchant!.companyName,
              redeemCode: null,
              status: 'pending_approval',
              timestamp: Timestamp.now(),
              userId: user.id,
              userName: user.name || 'Anonymous',
              category: item.category,
            };

            const newPendingOrder = { ...newCartItem }; // Use a copy for the merchant
            
            // Update merchant doc
            transaction.update(merchantDocRef, { 
                listings: currentListings,
                pendingOrders: arrayUnion(newPendingOrder),
            });
            // Update user doc
            transaction.update(userDocRef, {
                cart: arrayUnion(newCartItem)
            });
        });

        toast({
            title: "Added to Cart!",
            description: `${item.name} has been added to your cart.`,
        });
    } catch (error) {
        console.error("Error adding to cart:", error);
        toast({
            title: "Error",
            description: (error as Error).message || "Could not add item to cart.",
            variant: "destructive"
        });
    } finally {
        setAddingToCart(null);
    }
  };


 const handleMessageMerchant = async () => {
    if (!user || !merchantId) {
      toast({ title: "Error", description: "You must be logged in to message a merchant.", variant: "destructive" });
      return;
    }
    
    setIsCreatingChat(true);

    try {
        // Step 1: Fetch the full merchant document to get the ownerId
        const merchantDocRef = doc(db, 'merchants', merchantId);
        const merchantDocSnap = await getDoc(merchantDocRef);

        if (!merchantDocSnap.exists()) {
            throw new Error("Merchant details could not be found.");
        }
        const merchantData = merchantDocSnap.data() as Merchant;
        const ownerId = merchantData.ownerId;

        if (!ownerId) {
            throw new Error("Merchant owner information is missing.");
        }
        
        if (user.id === ownerId) {
            toast({ title: "Info", description: "You cannot start a chat with yourself.", variant: "default" });
            return;
        }

        const participantIds = [user.id, ownerId].sort();
        const chatId = participantIds.join('_');
        const chatDocRef = doc(db, 'chats', chatId);

        const chatDocSnap = await getDoc(chatDocRef);

        if (chatDocSnap.exists()) {
            router.push(`/chat/${chatId}`);
            return;
        }

        // Fetch owner's user data to create a complete participant profile
        const ownerUserDocRef = doc(db, 'users', ownerId);
        const ownerUserSnap = await getDoc(ownerUserDocRef);
        if (!ownerUserSnap.exists()) {
            throw new Error("Merchant owner's user account not found.");
        }
        const ownerUserData = ownerUserSnap.data() as User;

        const currentUserParticipant: ChatParticipant = {
            id: user.id,
            name: user.name || user.email || 'Anonymous User',
            avatar: user.avatar || null,
        };

        const merchantOwnerParticipant: ChatParticipant = {
            id: ownerId,
            name: ownerUserData.name || merchantData.companyName, 
            avatar: ownerUserData.avatar || merchantData.logo || null,
        };
        
        const chatData = {
            participantIds: participantIds,
            participants: [currentUserParticipant, merchantOwnerParticipant],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: null,
        };

        await setDoc(chatDocRef, chatData);
        router.push(`/chat/${chatId}`);

    } catch (error) {
        console.error("Error creating or finding chat:", error);
        toast({ title: "Error", description: (error as Error).message || "Could not start a conversation.", variant: "destructive" });
    } finally {
        setIsCreatingChat(false);
    }
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  if (!merchant) {
    return <div className="container mx-auto p-4 text-center">Merchant not found.</div>;
  }
  
  const fullAddress = [merchant.street, merchant.houseNumber, merchant.city, merchant.zipCode].filter(Boolean).join(', ');

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="w-full h-48 sm:h-64 md:h-80 bg-muted rounded-lg overflow-hidden mb-8 shadow-lg">
        {merchant.banner ? (
          <img src={merchant.banner} alt={`${merchant.companyName} banner`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200"></div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold font-headline">{merchant.companyName}</CardTitle>
            {merchant.category && <Badge className="mt-2 w-fit">{merchant.category}</Badge>}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
                <Avatar className="h-24 w-24 border">
                    <AvatarImage src={merchant.logo} alt={merchant.companyName} />
                    <AvatarFallback>{merchant.companyName?.[0] || 'M'}</AvatarFallback>
                </Avatar>
                <p className="text-muted-foreground flex-1 pt-2">{merchant.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Offerings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.length > 0 ? (
                listings.map((listing) => (
                  <Card key={listing.id} className="shadow-md hover:shadow-xl transition-shadow flex flex-col">
                    <CardHeader>
                      <CardTitle>{listing.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-lg font-semibold">{listing.price.toFixed(2)} LCL</p>
                      <p className="text-sm text-gray-500">Category: {listing.category}</p>
                      <p className="text-sm text-gray-500">In Stock: {listing.quantity}</p>
                     
                    </CardContent>
                     <CardContent>
                        <Button 
                            onClick={() => handleAddToCart(listing)} 
                            className="w-full mt-4" 
                            disabled={listing.quantity === 0 || !!addingToCart}
                        >
                          {addingToCart === listing.id ? <Loader2 className="animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                          {listing.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </Button>
                     </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center col-span-full text-muted-foreground py-8">No offerings listed yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Connect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 {fullAddress && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                    <MapPin className="h-5 w-5 flex-shrink-0" />
                    <span>{fullAddress}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                    {user && (
                         <Button onClick={handleMessageMerchant} disabled={isCreatingChat} className="w-full">
                            {isCreatingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4"/>}
                            Message Merchant
                         </Button>
                    )}
                    {merchant.website && (
                      <Button asChild variant="outline" className="w-full">
                        <a href={merchant.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="mr-2 h-4 w-4"/>
                          Visit Website
                        </a>
                      </Button>
                    )}
                    {merchant.instagram && (
                       <Button asChild variant="outline" className="w-full">
                         <a href={`https://instagram.com/${merchant.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer">
                           <Instagram className="mr-2 h-4 w-4"/>
                           View Instagram
                         </a>
                       </Button>
                    )}
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}

const MerchantPageSkeleton = () => (
  <div className="container mx-auto p-4 sm:p-6 lg:p-8">
    <Skeleton className="w-full h-48 sm:h-64 md:h-80 rounded-lg mb-8" />
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
            <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="flex-1 space-y-2 pt-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        </CardContent>
      </Card>
      <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3 mb-4" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-5/6 mb-4" />
                    <Skeleton className="h-6 w-1/2 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
      </Card>
    </div>
  </div>
);
