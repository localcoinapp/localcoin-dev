
'use client';

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import type { Merchant } from '@/types';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { AuthModal } from './auth-modal';

interface MerchantCardProps {
  merchant: Merchant;
}

export default function MerchantCard({ merchant }: MerchantCardProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cardContent = (
    <>
      <CardHeader className="p-0">
        <div className="relative h-40 w-full bg-muted">
          <Image
            src={merchant.logo || '/placeholder.svg'}
            alt={merchant.companyName}
            layout="fill"
            objectFit="contain"
            className="p-2"
            data-ai-hint={merchant.aiHint}
            unoptimized // Add this to bypass Next.js optimizer for local API routes if needed
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Badge variant="secondary" className="mb-2">{merchant.category}</Badge>
        <CardTitle className="text-xl font-bold font-headline">{merchant.companyName}</CardTitle>
        <CardDescription className="mt-2 text-sm text-muted-foreground line-clamp-3">{merchant.description}</CardDescription>
      </CardContent>
    </>
  );

  return (
    <>
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <Card
        className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      >
        <Link href={`/merchants/${merchant.id}`} passHref className="flex flex-col flex-grow cursor-pointer">
            {cardContent}
        </Link>
        <CardFooter className="p-4 bg-muted/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <span className="font-bold text-lg">{merchant.rating}</span>
          </div>
          <Link href={`/merchants/${merchant.id}`} passHref>
            <Button size="sm">
                View
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </>
  );
}
