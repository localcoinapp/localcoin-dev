'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Filter, List, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Merchant } from '@/types';
import MerchantCard from '@/components/merchant-card';
import MapView from '@/components/map-view';

const merchants: Merchant[] = [
  {
    id: '1',
    name: 'SunnySide Cafe',
    category: 'Cafe',
    rating: 4.5,
    imageUrl: 'https://placehold.co/600x400',
    aiHint: 'cafe interior',
    position: { lat: 34.052235, lng: -118.243683 },
    description: 'Cozy cafe with artisanal coffee and pastries.'
  },
  {
    id: '2',
    name: 'The Grand Hotel',
    category: 'Hotel',
    rating: 4.8,
    imageUrl: 'https://placehold.co/600x400',
    aiHint: 'hotel lobby',
    position: { lat: 34.053230, lng: -118.245680 },
    description: 'Luxurious hotel with stunning city views.'
  },
  {
    id: '3',
    name: 'Tech Cowork Space',
    category: 'Coworking',
    rating: 4.7,
    imageUrl: 'https://placehold.co/600x400',
    aiHint: 'coworking space',
    position: { lat: 34.051230, lng: -118.244680 },
    description: 'Modern coworking space with high-speed internet.'
  },
  {
    id: '4',
    name: 'Seaside Restaurant',
    category: 'Restaurant',
    rating: 4.6,
    imageUrl: 'https://placehold.co/600x400',
    aiHint: 'restaurant ocean',
    position: { lat: 34.049230, lng: -118.242680 },
    description: 'Fresh seafood with a view of the ocean.'
  },
];

const categories = ['All', 'Cafe', 'Hotel', 'Coworking', 'Restaurant', 'Events', 'Activities'];

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('list');
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-headline font-bold">Discover Local Services</h1>
        <p className="text-muted-foreground mt-2">
          Explore and connect with merchants in your area.
        </p>
      </div>

      <div className="bg-card p-4 rounded-lg shadow-md mb-8 sticky top-20 z-10">
        <div className="flex flex-col sm:flex-row gap-4">
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
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-accent hover:bg-accent/90">
              Search
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <MapPin className="h-4 w-4" />
              Map View
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="list">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {merchants.map((merchant) => (
              <MerchantCard key={merchant.id} merchant={merchant} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="map">
          <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-lg border">
            <MapView merchants={merchants} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
