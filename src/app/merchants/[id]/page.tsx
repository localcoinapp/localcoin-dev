
'use client'

import { Star, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { merchants } from '@/data/merchants';
import { cn } from '@/lib/utils';


export default function MerchantProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const merchant = merchants.find(m => m.id === id);

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
                        <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {merchant.items.map((item) => (
                        <TableRow key={item.id} className={cn(item.quantity === 0 && 'text-muted-foreground line-through')}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                             <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                            <TableCell className="text-right">
                                {item.quantity > 0 ? (
                                    <span>{item.price.toFixed(2)} {siteConfig.token.symbol}</span>
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
