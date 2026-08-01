// Ficheiro: src/components/MapDisplay.jsx
// Mapa embutido da entrega: mostra o entregador AO VIVO, o destino ativo
// (restaurante na retirada -> cliente na entrega) e a linha até ele.

import React, { useMemo, useState, useEffect } from 'react';
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

  // Linha RETA (fallback) entre entregador e destino.
  const straightLine = useMemo(
    () => (driverCoords && destination ? [driverCoords, destination] : null),
    [driverCoords, destination]
  );

  // ROTA REAL pelas ruas (OSRM público): o entregador vê o trajeto no próprio
  // app, sem precisar abrir Waze/Maps (que seguem como opção nos botões). Se o
  // OSRM falhar, cai na linha reta. Coords do OSRM vêm [lng,lat] -> viramos [lat,lng].
  // OBS: router.project-osrm.org é demo público (baixo volume); pra escala, self-host.
  const [routeGeo, setRouteGeo] = useState(null);
  const dLat = driverCoords?.[0], dLng = driverCoords?.[1];
  const tLat = destination?.[0], tLng = destination?.[1];
  useEffect(() => {
    if (dLat == null || dLng == null || tLat == null || tLng == null) { setRouteGeo(null); return; }
    let alive = true;
    const ctrl = new AbortController();
    const url = `https://router.project-osrm.org/route/v1/driving/${dLng},${dLat};${tLng},${tLat}?overview=full&geometries=geojson`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('osrm'))))
      .then((data) => {
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (alive && Array.isArray(coords) && coords.length) {
          setRouteGeo(coords.map(([lng, lat]) => [lat, lng]));
        }
      })
      .catch(() => { if (alive) setRouteGeo(null); });
    return () => { alive = false; ctrl.abort(); };
  }, [dLat, dLng, tLat, tLng]);

  const routeLine = routeGeo || straightLine;
  const fitPoints = routeGeo || [driverCoords, destination];

  return (
    // isolate: cria um stacking context próprio pro mapa, senão os controles do
    // Leaflet (z-index ~1000) "furam" e ficam por cima dos modais da página.
    <div className="isolate w-full h-full">
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
        <Polyline
          positions={routeLine}
          pathOptions={{ color: '#FF6B35', weight: 5, opacity: 0.9, dashArray: routeGeo ? null : '8 10' }}
        />
      )}

      <FitBounds points={fitPoints} />
    </MapContainer>
    </div>
  );
}

export default MapDisplay;
