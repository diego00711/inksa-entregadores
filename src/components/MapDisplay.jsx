// Ficheiro: src/components/MapDisplay.jsx
// Mapa embutido da entrega: mostra o entregador AO VIVO, o destino ativo
// (restaurante na retirada -> cliente na entrega) e a linha até ele.

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Corrige os ícones padrão do Leaflet (senão o marcador some no bundle)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Marcador do entregador: bolinha laranja (destaca da chincheta padrão)
const driverIcon = L.divIcon({
  className: '',
  html:
    '<div style="width:18px;height:18px;border-radius:50%;background:#FF6B35;' +
    'border:3px solid #fff;box-shadow:0 0 0 3px rgba(255,107,53,.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Enquadra o mapa pra caber o entregador + o destino ativo
function FitBounds({ points }) {
  const map = useMap();
  const key = JSON.stringify(points);
  React.useEffect(() => {
    const pts = (points || []).filter(Boolean);
    if (pts.length === 0) return;
    if (pts.length === 1) { map.setView(pts[0], 15); return; }
    try { map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 }); } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

// phase: 'pickup' (indo ao restaurante) | 'delivery' (indo ao cliente)
export function MapDisplay({ driverCoords, pickupCoords, deliveryCoords, phase = 'pickup' }) {
  const destination = phase === 'delivery' ? deliveryCoords : pickupCoords;
  const center = driverCoords || destination || deliveryCoords || pickupCoords || [-27.8167, -50.3264]; // Lages/SC
  const routeLine = useMemo(
    () => (driverCoords && destination ? [driverCoords, destination] : null),
    [driverCoords, destination]
  );

  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {pickupCoords && (
        <Marker position={pickupCoords}>
          <Popup>🍔 Restaurante (coleta)</Popup>
        </Marker>
      )}
      {deliveryCoords && (
        <Marker position={deliveryCoords}>
          <Popup>📍 Cliente (entrega)</Popup>
        </Marker>
      )}
      {driverCoords && (
        <Marker position={driverCoords} icon={driverIcon}>
          <Popup>🛵 Você está aqui</Popup>
        </Marker>
      )}

      {routeLine && (
        <Polyline positions={routeLine} pathOptions={{ color: '#FF6B35', weight: 4, opacity: 0.85, dashArray: '8 10' }} />
      )}

      <FitBounds points={[driverCoords, destination]} />
    </MapContainer>
  );
}

export default MapDisplay;
