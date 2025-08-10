
'use client';

import { useEffect, useRef } from 'react';
import type { Merchant } from '@/types';
import 'leaflet/dist/leaflet.css';
// Import marker icons
import 'leaflet/dist/images/marker-icon.png';
import 'leaflet/dist/images/marker-icon-2x.png';
import 'leaflet/dist/images/marker-shadow.png';


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

     // Manually set icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default.src,
      iconUrl: require('leaflet/dist/images/marker-icon.png').default.src,
      shadowUrl: require('leaflet/dist/images/marker-shadow.png').default.src,
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
          const marker = L.marker([merchant.position.lat, merchant.position.lng])
            .bindPopup(`<b>${merchant.companyName}</b><br><a href="/merchants/${merchant.id}" style="color: blue; text-decoration: underline;">View Details</a>`);
          
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
