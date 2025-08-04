
'use client'

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Merchant } from "@/types";
import { MapPin } from "lucide-react";
import ReactDOMServer from 'react-dom/server';
import { renderToStaticMarkup } from 'react-dom/server';
import MerchantCard from './merchant-card';
import { Button } from './ui/button';
import Link from 'next/link';

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
        // Initialize map only if the container exists and map is not already initialized.
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                center: defaultPosition,
                zoom: 13,
                scrollWheelZoom: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);
        }

        // Cleanup function to run when component unmounts
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only once on mount and cleanup on unmount

    useEffect(() => {
        if (mapRef.current) {
            // Clear existing markers
            mapRef.current.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    mapRef.current?.removeLayer(layer);
                }
            });

            // Add new markers
            merchants.forEach((merchant) => {
                const marker = L.marker([merchant.position.lat, merchant.position.lng], { icon: customIcon })
                    .addTo(mapRef.current!);
                
                const popupContent = document.createElement('div');
                popupContent.style.width = '256px';

                // This is a bit of a workaround to render a React component inside a Leaflet popup
                const cardHtml = renderToStaticMarkup(
                    <Card className="flex flex-col overflow-hidden">
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
                            <Button size="sm" asChild>
                                <Link href={`/chat/${merchant.id}`}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Chat
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                );
                
                // We can't use the MerchantCard directly because it uses next/image and next/link which needs the React context.
                // A simplified version is created here for the popup.
                const popupNode = document.createElement('div');
                popupNode.innerHTML = ReactDOMServer.renderToString(
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

    return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />;
};

// Dummy components to avoid breaking the renderToStaticMarkup call
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>
const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>
const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>
const CardFooter = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>
const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>
const CardDescription = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>
const Badge = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>
const Star = ({ className }: { className?: string }) => <svg className={className} />;
const MessageSquare = ({ className }: { className?: string }) => <svg className={className} />;
const Image = (props: any) => <img {...props} />;


export default MapView;
