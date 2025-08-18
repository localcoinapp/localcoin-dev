
'use client';

import { useEffect, useRef } from 'react';
import type { Merchant } from '@/types';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  merchants: Merchant[];
}

const MapView = ({ merchants }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const merchantMarkersRef = useRef<L.Marker[]>([]);

  // 1. Initialize map and user location marker
  useEffect(() => {
    // Dynamically import Leaflet only on the client side
    const L = require('leaflet');

    // Manually set icon paths to prevent bundling issues
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
    
    if (mapRef.current && !mapInstance.current) {
      
      // Initialize map
      mapInstance.current = L.map(mapRef.current).setView([40.7128, -74.0060], 12); // Default to NYC

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstance.current);

      // Attempt to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const userLatLng = L.latLng(latitude, longitude);
            
            // Center the map on the user's location
            mapInstance.current?.setView(userLatLng, 13);

            // Define a custom red icon for the user
            const userIcon = new L.Icon({
                iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            // Add or update the user marker
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng(userLatLng);
            } else {
              userMarkerRef.current = L.marker(userLatLng, { icon: userIcon })
                .addTo(mapInstance.current!)
                .bindPopup("You are here");
            }
          },
          (error) => {
            console.error("Geolocation error:", error.message);
            // If user denies location, and we have merchants, fit map to them.
            if (merchants.length > 0) {
                const validMerchants = merchants.filter(m => m.position && typeof m.position.lat === 'number' && typeof m.position.lng === 'number');
                if (validMerchants.length > 0) {
                    const bounds = L.latLngBounds(validMerchants.map(m => [m.position.lat, m.position.lng]));
                    if (bounds.isValid()) {
                       mapInstance.current?.fitBounds(bounds, { padding: [50, 50] });
                    }
                }
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }
    }
    // This effect should only run once to initialize the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // 2. Update merchant markers when the merchants prop changes
  useEffect(() => {
    const L = require('leaflet');
    if (mapInstance.current) {
      // Clear existing merchant markers from the map
      merchantMarkersRef.current.forEach(marker => {
        mapInstance.current?.removeLayer(marker);
      });
      merchantMarkersRef.current = []; // Clear the array

      // Filter for merchants with valid geographic positions
      const validMerchants = merchants.filter(m => m.position && typeof m.position.lat === 'number' && typeof m.position.lng === 'number');

      // Create and add new markers for each valid merchant
      validMerchants.forEach(merchant => {
          const popupContent = `
            <div style="font-family: sans-serif;">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                <img src="${merchant.logo || 'https://placehold.co/50x50'}" alt="${merchant.companyName}" style="width:50px; height:50px; border-radius:4px; object-fit:contain;" />
                <div>
                    <h4 style="margin:0; font-size:16px; font-weight:bold;">${merchant.companyName}</h4>
                    <span style="font-size: 12px; background-color: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 9999px;">${merchant.category}</span>
                </div>
              </div>
              <p style="margin:0 0 10px; font-size:14px; color:#555;">${merchant.description}</p>
              <a href="/merchants/${merchant.id}" style="display:inline-block; padding: 8px 16px; background-color: hsl(var(--accent)); color: hsl(var(--accent-foreground)); text-decoration: none; border-radius: 0.5rem; font-weight: 500; font-size: 14px; text-align: center;">View Details</a>
            </div>
          `;
          const marker = L.marker([merchant.position.lat, merchant.position.lng])
            .bindPopup(popupContent);
          
          marker.addTo(mapInstance.current!);
          merchantMarkersRef.current.push(marker); // Store new marker
      });

      // Adjust map view to show all merchants if user's location isn't available
      if (validMerchants.length > 0 && !userMarkerRef.current) {
        const bounds = L.latLngBounds(validMerchants.map(m => [m.position.lat, m.position.lng]));
        if (bounds.isValid()) {
            mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }
  }, [merchants]); // This effect re-runs whenever the 'merchants' prop changes

  return <div ref={mapRef} style={{ height: '100%', minHeight: '600px', width: '100%', borderRadius: '0.5rem' }} />;
};

export default MapView;
