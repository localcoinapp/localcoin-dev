
'use client'

import { Star, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Merchant, MerchantItem } from '@/types';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';

// In a real app, you would fetch this data. For now, we reuse the mock data.
const merchants: Merchant[] = [
    {
      id: '1',
      name: 'Kaffee Klatsch',
      category: 'Cafe',
      rating: 4.7,
      imageUrl: 'https://placehold.co/600x400',
      aiHint: 'berlin cafe',
      position: { lat: 52.516, lng: 13.452 },
      description: 'Artsy cafe with direct-trade coffee and vegan cakes.',
      items: [
        { id: 'i1', name: 'Espresso', price: 2.50 },
        { id: 'i2', name: 'Cappuccino', price: 3.50 },
        { id: 'i3', name: 'Vegan Carrot Cake', price: 4.00 },
      ]
    },
    {
      id: '2',
      name: 'Hotel an der Spree',
      category: 'Hotel',
      rating: 4.8,
      imageUrl: 'https://placehold.co/600x400',
      aiHint: 'modern hotel',
      position: { lat: 52.514, lng: 13.456 },
      description: 'Stylish hotel with a beautiful view of the Spree river.',
      items: [
        { id: 'i4', name: 'Standard Room', price: 120.00 },
        { id: 'i5', name: 'Suite with River View', price: 250.00 },
        { id: 'i6', name: 'Breakfast Buffet', price: 25.00 },
      ]
    },
    {
      id: '3',
      name: 'Friedrichshain Coworking',
      category: 'Coworking',
      rating: 4.9,
      imageUrl: 'https://placehold.co/600x400',
      aiHint: 'coworking space',
      position: { lat: 52.517, lng: 13.458 },
      description: 'Creative coworking space with 24/7 access.',
       items: [
        { id: 'i7', name: 'Day Pass', price: 20.00 },
        { id: 'i8', name: 'Monthly Membership', price: 200.00 },
        { id: 'i9', name: 'Private Office', price: 500.00 },
      ]
    },
    {
      id: '4',
      name: 'Restaurant Spindler',
      category: 'Restaurant',
      rating: 4.6,
      imageUrl: 'https://placehold.co/600x400',
      aiHint: 'fine dining',
      position: { lat: 52.513, lng: 13.451 },
      description: 'Modern European cuisine in a restored industrial building.',
       items: [
        { id: 'i10', name: '3-Course Menu', price: 55.00 },
        { id: 'i11', name: 'Wine Pairing', price: 30.00 },
        { id: 'i12', name: 'Business Lunch', price: 25.00 },
      ]
    },
  ];
  

export default function MerchantProfilePage({ params }: { params: { id: string } }) {
  const merchant = merchants.find(m => m.id === params.id);

  if (!merchant) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="overflow-hidden shadow-2xl">
        <CardHeader className="p-0">
          <div className="relative h-64 w-full">
            <Image
              src={merchant.imageUrl}
              alt={merchant.name}
              layout="fill"
              objectFit="cover"
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
                        <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {merchant.items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">{item.price.toFixed(2)} {siteConfig.token.symbol}</TableCell>
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
