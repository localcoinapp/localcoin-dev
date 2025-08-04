
'use client'

import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Merchant } from "@/types";
import MerchantCard from "./merchant-card";
import { Icon } from 'leaflet';
import { MapPin } from "lucide-react";
import ReactDOMServer from 'react-dom/server';

interface MapViewProps {
  merchants: Merchant[];
}

const customIcon = new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(ReactDOMServer.renderToStaticMarkup(
    <MapPin className="h-8 w-8 text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" />
  ))}`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});


const MapView: React.FC<MapViewProps> = ({ merchants }) => {
  const defaultPosition: [number, number] = [34.052235, -118.243683]; // Default to LA
  
  return (
    <MapContainer center={defaultPosition} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {merchants.map((merchant) => (
        <Marker key={merchant.id} position={[merchant.position.lat, merchant.position.lng]} icon={customIcon}>
          <Popup>
            <div className="w-64">
             <MerchantCard merchant={merchant} />
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
