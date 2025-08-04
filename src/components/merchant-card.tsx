import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare } from 'lucide-react';
import type { Merchant } from '@/types';
import Link from 'next/link';
import { Badge } from './ui/badge';

interface MerchantCardProps {
  merchant: Merchant;
}

export default function MerchantCard({ merchant }: MerchantCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full">
          <Image
            src={merchant.imageUrl}
            alt={merchant.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={merchant.aiHint}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Badge variant="secondary" className="mb-2">{merchant.category}</Badge>
        <CardTitle className="text-xl font-bold font-headline">{merchant.name}</CardTitle>
        <CardDescription className="mt-2 text-sm text-muted-foreground">{merchant.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 bg-muted/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-current" />
          <span className="font-bold text-lg">{merchant.rating}</span>
        </div>
        <Link href={`/chat/${merchant.id}`} passHref>
          <Button size="sm">
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
