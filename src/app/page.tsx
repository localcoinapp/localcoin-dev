
'use client';

import { useState, useEffect } from 'react';
import { Filter, Search, List, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import MerchantCard from '@/components/merchant-card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Merchant } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { storeCategories } from '@/data/store-categories';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <Skeleton className="h-[600px] w-full" />,
});

const HeroBanner = () => {
  return (
    <div
      className="relative mb-4 rounded-lg py-8 px-12 text-center text-background shadow-lg transition-all duration-300 bg-cover bg-center"
      style={{ backgroundImage: "var(--hero-banner-image, none)" }}
      data-ai-hint="tropical beach"
    >
      <div 
        className="absolute inset-0 rounded-lg"
        style={{ backgroundImage: "var(--gradient-hero, none)" }}
      ></div>
      <div className="relative z-10">
        <h1 className="text-4xl font-headline font-bold text-white drop-shadow-md">Discover Local Services</h1>
        <p className="mt-2 text-white/90 drop-shadow-md">
          Explore and connect with merchants in your area.
        </p>
      </div>
    </div>
  );
};


export default function MarketplacePage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        setLoading(true);
        const merchantsCollection = collection(db, 'merchants');
        const q = query(merchantsCollection, where("status", "==", "live"));
        const merchantSnapshot = await getDocs(q);
        const merchantList = merchantSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Merchant));
        setMerchants(merchantList);
      } catch (error) {
        console.error("Error fetching merchants: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch merchants from the database.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMerchants();
  }, [toast]);
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <HeroBanner />

      <Tabs defaultValue="list">
        <div className="bg-card p-4 rounded-lg shadow-md mb-8 sticky top-[65px] z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-auto flex-grow flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search services, items, or merchants..." className="pl-10" />
            </div>
            <div className="flex gap-4">
              <Select defaultValue="All">
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {storeCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="bg-accent hover:bg-accent/90">
                Search
              </Button>
            </div>
          </div>
           <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="list"><List className="mr-2" />List View</TabsTrigger>
              <TabsTrigger value="map"><Map className="mr-2" />Map View</TabsTrigger>
            </TabsList>
        </div>
        
        <TabsContent value="list">
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
              </div>
            ) : merchants.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {merchants.map((merchant) => (
                  <MerchantCard key={merchant.id} merchant={merchant} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No live merchants found.</p>
                <p className="text-sm text-muted-foreground">Merchants will appear here once they go live.</p>
              </div>
            )}
        </TabsContent>
        <TabsContent value="map">
          <div className="w-full h-[600px] rounded-lg overflow-hidden">
            <MapView merchants={merchants} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
