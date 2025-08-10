
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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Merchant } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { seedDatabase } from '@/lib/seed';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { storeCategories } from '@/data/store-categories';

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <Skeleton className="h-[600px] w-full" />,
});

export default function MarketplacePage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const merchantsCollection = collection(db, 'merchants');
        const merchantSnapshot = await getDocs(merchantsCollection);
        const merchantList = merchantSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Merchant));
        
        if (merchantList.length === 0 && !isSeeding) {
          handleSeed();
        } else {
          setMerchants(merchantList);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching merchants: ", error);
        setLoading(false);
      }
    };

    fetchMerchants();
  }, [isSeeding]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDatabase();
      toast({
        title: "Success",
        description: "Database has been seeded with initial data.",
      });
      // Re-fetch merchants to update the UI
      const merchantsCollection = collection(db, 'merchants');
      const merchantSnapshot = await getDocs(merchantsCollection);
      const merchantList = merchantSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Merchant));
      setMerchants(merchantList);
    } catch (error) {
      console.error("Error seeding database: ", error);
      toast({
        variant: "destructive",
        title: "Seeding Failed",
        description: "Could not seed the database. Check console for errors.",
      })
    } finally {
      setIsSeeding(false);
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-headline font-bold">Discover Local Services</h1>
        <p className="text-muted-foreground mt-2">
          Explore and connect with merchants in your area.
        </p>
      </div>

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
                <p className="text-muted-foreground mb-4">Your database is empty. Click the button to add some sample data.</p>
                <Button onClick={handleSeed} disabled={isSeeding}>
                  {isSeeding ? 'Seeding...' : 'Seed Database'}
                </Button>
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
