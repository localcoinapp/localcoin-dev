
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
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Merchant, MerchantItem } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function MerchantProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;

    const merchantDocRef = doc(db, 'merchants', id);
    const unsubscribe = onSnapshot(merchantDocRef, (doc) => {
      if (doc.exists()) {
        setMerchant({ id: doc.id, ...doc.data() } as Merchant);
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
  
  const handleAddToCart = (item: any) => {
    // This is a placeholder. In a real app, this would add the item to the user's cart in the database.
    console.log(`Added ${item.name} to cart`);
    toast({
      title: "Added to Cart",
      description: `${item.name} has been added to your cart. The merchant will review your request.`,
    })
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="overflow-hidden shadow-2xl">
        <CardHeader className="p-0">
          <div className="relative h-64 w-full">
            <Image
              src={merchant.imageUrl}
              alt={merchant.name}
              fill
              className="object-cover"
              data-ai-hint={merchant.aiHint}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
              <Badge variant="secondary" className="mb-2">{merchant.category}</Badge>
              <CardTitle className="text-4xl font-bold font-headline">{merchant.name}</CardTitle>
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
                        {(merchant.items || []).map((item: MerchantItem) => (
                        <TableRow key={item.id} className={cn(item.quantity === 0 && 'text-muted-foreground')}>
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
        </CardContent>
      </Card>
    </div>
  );
}

