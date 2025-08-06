
'use client';

import { useEffect, useRef } from 'react';
import type { Merchant } from '@/types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet's default icon paths can break in Next.js. This fixes it.
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

interface MapViewProps {
  merchants: Merchant[];
}

const MapView = ({ merchants }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current) {
        // Fix for default icon paths
        const defaultIcon = L.icon({
            iconRetinaUrl: iconRetinaUrl.src,
            iconUrl: iconUrl.src,
            shadowUrl: shadowUrl.src,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });
        L.Marker.prototype.options.icon = defaultIcon;

        // Initialize map only once
        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([52.52, 13.405], 12); // Default view (Berlin)

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapInstance.current);
        }

        // Clear existing markers
        mapInstance.current.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                mapInstance.current?.removeLayer(layer);
            }
        });

        // Add new markers
        if (merchants.length > 0) {
            const bounds = L.latLngBounds(merchants.map(m => [m.position.lat, m.position.lng]));
            merchants.forEach(merchant => {
                L.marker([merchant.position.lat, merchant.position.lng])
                .addTo(mapInstance.current!)
                .bindPopup(`<b>${merchant.name}</b><br><a href="/merchants/${merchant.id}">View Details</a>`);
            });

            if (bounds.isValid()) {
                mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }
  }, [merchants]);

  return <div ref={mapRef} style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }} />;
};

export default MapView;

