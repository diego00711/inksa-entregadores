// Ficheiro: src/components/MapDisplay.jsx

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Corrige um problema comum com os ícones do marcador no React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// O componente recebe as coordenadas da coleta e da entrega
export function MapDisplay({ pickupCoords, deliveryCoords }) {
  // Posição central do mapa (calculada ou padrão)
  const centerPosition = deliveryCoords || pickupCoords || [-27.2178, -49.645]; // Posição padrão (Rio do Sul, SC)

  return (
    <MapContainer center={centerPosition} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '8px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Marcador para o local de coleta (Restaurante) */}
      {pickupCoords && (
        <Marker position={pickupCoords}>
          <Popup>Ponto de Coleta</Popup>
        </Marker>
      )}

      {/* Marcador para o local de entrega (Cliente) */}
      {deliveryCoords && (
        <Marker position={deliveryCoords}>
          <Popup>Ponto de Entrega</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}