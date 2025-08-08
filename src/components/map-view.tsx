
'use client';

import { useEffect, useRef } from 'react';
import type { Merchant } from '@/types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet's default icon paths can break in Next.js. This fixes it.
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import userIconUrl from 'leaflet/dist/images/marker-icon.png'; // Placeholder, ideally a different icon

interface MapViewProps {
  merchants: Merchant[];
}

const MapView = ({ merchants }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current) {
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

        // Initialize map
        mapInstance.current = L.map(mapRef.current).setView([52.52, 13.405], 12); // Default view (Berlin)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstance.current);

        // Get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                const userLatLng = L.latLng(latitude, longitude);
                mapInstance.current?.setView(userLatLng, 13);
                
                // Add or move user marker
                if (userMarkerRef.current) {
                    userMarkerRef.current.setLatLng(userLatLng);
                } else {
                    // Ideally use a different icon for the user
                    const blueIcon = new L.Icon({
                        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                      });
                    userMarkerRef.current = L.marker(userLatLng, { icon: blueIcon })
                        .addTo(mapInstance.current!)
                        .bindPopup("You are here");
                }
            }, () => {
                console.log("Could not get user's location.");
            });
        }
    }
  }, []); // Run only once on mount

  useEffect(() => {
    if (mapInstance.current) {
        // Clear existing merchant markers
        mapInstance.current.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer !== userMarkerRef.current) {
                mapInstance.current?.removeLayer(layer);
            }
        });

        // Filter merchants to only include those with valid positions
        const merchantsWithPosition = merchants.filter(m => m.position && typeof m.position.lat === 'number' && typeof m.position.lng === 'number');

        // Add new markers for merchants
        merchantsWithPosition.forEach(merchant => {
            L.marker([merchant.position.lat, merchant.position.lng])
            .addTo(mapInstance.current!)
            .bindPopup(`<b>${merchant.companyName}</b><br><a href="/merchants/${merchant.id}">View Details</a>`);
        });

        // Adjust bounds if user location wasn't found and we have merchants
        if (merchantsWithPosition.length > 0 && !userMarkerRef.current) {
             const bounds = L.latLngBounds(merchantsWithPosition.map(m => [m.position.lat, m.position.lng]));
             if (bounds.isValid()) {
                mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }
  }, [merchants]); // Rerun when merchants change

  return <div ref={mapRef} style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }} />;
};

export default MapView;
