
'use client'

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Merchant, MerchantItem } from '@/types';
import { Globe, Instagram, MapPin } from 'lucide-react';

interface Listing extends MerchantItem {
  title?: string; 
}

export default function MerchantPage() {
  const { id } = useParams();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const merchantId = Array.isArray(id) ? id[0] : id;
      const merchantDocRef = doc(db, 'merchants', merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const merchantData = { id: snapshot.id, ...snapshot.data() } as Merchant;
          setMerchant(merchantData);
          if (merchantData.listings) {
            setListings(merchantData.listings);
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
  }, [id]);

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
                  <Card key={listing.id} className="shadow-md hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <CardTitle>{listing.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">${listing.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">Category: {listing.category}</p>
                      <p className="text-sm text-gray-500">In Stock: {listing.quantity}</p>
                      <Button asChild className="mt-4 w-full" disabled={!listing.active || listing.quantity === 0}>
                        <Link href={`/listing/${listing.id}`}>
                           {(!listing.active || listing.quantity === 0) ? 'Unavailable' : 'View Details'}
                        </Link>
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

    
