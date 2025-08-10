
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

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!user) {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const cardContent = (
    <div className='cursor-pointer'>
      <CardHeader className="p-0">
        <div className="relative h-40 w-full bg-muted">
          <img
            src={merchant.logo || '/placeholder.svg'}
            alt={merchant.companyName}
            className="h-full w-full object-contain"
            data-ai-hint={merchant.aiHint}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Badge variant="secondary" className="mb-2">{merchant.category}</Badge>
        <CardTitle className="text-xl font-bold font-headline">{merchant.companyName}</CardTitle>
        <CardDescription className="mt-2 text-sm text-muted-foreground">{merchant.description}</CardDescription>
      </CardContent>
    </div>
  );

  return (
    <>
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <Card
        className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        onClick={handleCardClick}
      >
        {user ? (
          <Link href={`/merchants/${merchant.id}`} passHref>
            {cardContent}
          </Link>
        ) : (
          cardContent
        )}
        <CardFooter className="p-4 bg-muted/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <span className="font-bold text-lg">{merchant.rating}</span>
          </div>
          {user ? (
            <Link href={`/merchants/${merchant.id}`} passHref>
              <Button size="sm">
                View
              </Button>
            </Link>
          ) : (
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              View
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
}
