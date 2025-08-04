
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

// Custom icon for merchants
const merchantIconHtml = renderToStaticMarkup(
    <MapPin className="h-8 w-8 text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" />
);
const merchantIcon = new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(merchantIconHtml)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

// Custom icon for the user
const userIconHtml = renderToStaticMarkup(
    <div className="text-accent">
        <MapPin className="h-10 w-10 text-accent drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" />
    </div>
);
const userIcon = new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(userIconHtml)}`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});


const MapView: React.FC<MapViewProps> = ({ merchants }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const defaultPosition: L.LatLngExpression = [52.515, 13.454]; // Default to Friedrichshain, Berlin

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                center: defaultPosition,
                zoom: 15,
                scrollWheelZoom: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);

            // Geolocate user
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const userPosition: L.LatLngExpression = [position.coords.latitude, position.coords.longitude];
                    if (mapRef.current) {
                        mapRef.current.setView(userPosition, 15);
                        L.marker(userPosition, { icon: userIcon }).addTo(mapRef.current);
                    }
                }, (error) => {
                    console.warn("Could not get user location, defaulting to Berlin.", error.message)
                });
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
            // Clear existing markers to prevent duplicates on re-render
             mapRef.current.eachLayer((layer) => {
                if (layer instanceof L.Marker && layer.options.icon !== userIcon) {
                   mapRef.current?.removeLayer(layer);
                }
            });

            // Add new markers for merchants
            merchants.forEach((merchant) => {
                const marker = L.marker([merchant.position.lat, merchant.position.lng], { icon: merchantIcon })
                    .addTo(mapRef.current!);
                
                const popupNode = document.createElement('div');
                // Using standard img tag with classes for styling to avoid React-specific prop errors
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

    return <div ref={mapContainerRef} className="z-10" style={{ height: '100%', width: '100%' }} />;
};

export default MapView;
