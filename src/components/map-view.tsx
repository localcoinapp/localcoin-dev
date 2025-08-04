
'use client'

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Merchant } from "@/types";
import { MapPin } from "lucide-react";
import { renderToStaticMarkup } from 'react-dom/server';

interface MapViewProps {
  merchants: Merchant[];
}

const customIconHtml = renderToStaticMarkup(
    <MapPin className="h-8 w-8 text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" />
);

const customIcon = new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(customIconHtml)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});


const MapView: React.FC<MapViewProps> = ({ merchants }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const defaultPosition: L.LatLngExpression = [34.052235, -118.243683]; // Default to LA

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                center: defaultPosition,
                zoom: 13,
                scrollWheelZoom: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);
            
            // Adjust z-index of map panes
            const markerPane = mapRef.current.getPane('markerPane');
            if (markerPane) {
                markerPane.style.zIndex = '50';
            }
            const popupPane = mapRef.current.getPane('popupPane');
            if (popupPane) {
                popupPane.style.zIndex = '60';
            }
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); 

    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    mapRef.current?.removeLayer(layer);
                }
            });

            merchants.forEach((merchant) => {
                const marker = L.marker([merchant.position.lat, merchant.position.lng], { icon: customIcon })
                    .addTo(mapRef.current!);
                
                const popupNode = document.createElement('div');
                popupNode.innerHTML = renderToStaticMarkup(
                    <div className="w-64">
                        <div className="relative h-32 w-full mb-2 rounded-t-lg overflow-hidden">
                            <img src={merchant.imageUrl} alt={merchant.name} className="h-full w-full object-cover" data-ai-hint={merchant.aiHint} />
                        </div>
                        <div className="p-2">
                           <p className="text-xs text-muted-foreground">{merchant.category}</p>
                           <h3 className="font-bold font-headline text-lg">{merchant.name}</h3>
                           <p className="text-sm mt-1">{merchant.description}</p>
                           <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                                    <span className="font-bold">{merchant.rating}</span>
                                </div>
                                <a href={`/chat/${merchant.id}`} className="text-sm text-primary hover:underline">Chat</a>
                           </div>
                        </div>
                    </div>
                );
                marker.bindPopup(popupNode);
            });
        }
    }, [merchants]);

    return <div ref={mapContainerRef} className="z-0" style={{ height: '100%', width: '100%' }} />;
};

export default MapView;
