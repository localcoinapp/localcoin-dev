'use client'

import React from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Merchant } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MapPin } from "lucide-react";
import MerchantCard from "./merchant-card";

interface MapViewProps {
  merchants: Merchant[];
}

const MapView: React.FC<MapViewProps> = ({ merchants }) => {
  const defaultPosition = { lat: 34.052235, lng: -118.243683 }; // Default to LA
  
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Map
        defaultCenter={defaultPosition}
        defaultZoom={13}
        mapId="localcoin_map"
        gestureHandling={'greedy'}
        disableDefaultUI={true}
      >
        {merchants.map((merchant) => (
          <Popover key={merchant.id}>
            <PopoverTrigger asChild>
              <AdvancedMarker position={merchant.position}>
                <button className="focus:outline-none">
                  <MapPin className="h-8 w-8 text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] transition-transform hover:scale-110" />
                </button>
              </AdvancedMarker>
            </PopoverTrigger>
            <PopoverContent className="w-80 border-primary shadow-xl">
              <MerchantCard merchant={merchant} />
            </PopoverContent>
          </Popover>
        ))}
      </Map>
    </APIProvider>
  );
};

export default MapView;
