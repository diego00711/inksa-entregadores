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

// Distância em metros entre dois pontos (haversine). Serve pra saber se o
// entregador andou o bastante pra valer a pena recalcular a rota.
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Enquadra o mapa pra caber o entregador + o destino ativo.
//
// Enquadra UMA VEZ por destino. Antes reenquadrava a cada atualização da rota
// — e como a rota vinha a cada tick do GPS, o mapa se remexia sozinho o tempo
// todo: dava pra ver o trajeto, mas não dava pra ARRASTAR o mapa, porque em
// menos de um segundo ele voltava sozinho pro enquadramento automático.
function FitBounds({ points, resetKey }) {
  const map = useMap();
  const jaEnquadrou = React.useRef(null);
  React.useEffect(() => {
    const pts = (points || []).filter(Boolean);
    if (pts.length === 0) return;
    if (jaEnquadrou.current === resetKey) return;
    jaEnquadrou.current = resetKey;
    if (pts.length === 1) { map.setView(pts[0], 15); return; }
    try { map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 }); } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, resetKey, points]);
  return null;
}

// phase: 'pickup' (indo ao restaurante) | 'delivery' (indo ao cliente)
// fullscreen: esconde os controles do Leaflet (o mapa vira fundo da tela e quem
//   manda são os botões flutuantes da página)
// onRouteInfo: devolve { km, min } da rota real. O OSRM já calculava isso e a
//   gente jogava fora — era a informação mais útil da tela indo pro lixo.
export function MapDisplay({
  driverCoords, pickupCoords, deliveryCoords, phase = 'pickup',
  fullscreen = false, onRouteInfo,
}) {
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
  // Ref pro callback: se entrasse na lista de dependências, um pai que recria a
  // função a cada render refaria a chamada ao OSRM sem parar.
  const routeInfoRef = React.useRef(onRouteInfo);
  React.useEffect(() => { routeInfoRef.current = onRouteInfo; }, [onRouteInfo]);

  // De onde a rota atual foi calculada. Sem isto o roteador é chamado a CADA
  // atualização do GPS: o watchPosition com enableHighAccuracy dispara ~1x por
  // segundo com o entregador andando, e o jitter das últimas casas decimais
  // faz o valor mudar mesmo parado. Dava ~1.200 chamadas numa entrega de 20
  // min, por entregador — o servidor público bloquearia na primeira semana, e
  // nenhum plano pago sairia barato nesse volume.
  const routedFrom = React.useRef(null);

  useEffect(() => {
    if (dLat == null || dLng == null || tLat == null || tLng == null) {
      setRouteGeo(null);
      routeInfoRef.current?.(null);
      routedFrom.current = null;
      return;
    }

    // Recalcula só quando muda o DESTINO (troca de fase) ou quando o
    // entregador andou de verdade. 120 m ≈ um quarteirão: perto disso a rota
    // desenhada continua correta, e o "faltam X km" não muda o suficiente pra
    // alguém notar.
    const ref = routedFrom.current;
    const mesmoDestino = ref && ref.tLat === tLat && ref.tLng === tLng;
    if (mesmoDestino && distanciaMetros(ref.dLat, ref.dLng, dLat, dLng) < 120) return;
    routedFrom.current = { dLat, dLng, tLat, tLng };

    let alive = true;
    const ctrl = new AbortController();
    const url = `https://router.project-osrm.org/route/v1/driving/${dLng},${dLat};${tLng},${tLat}?overview=full&geometries=geojson`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('osrm'))))
      .then((data) => {
        if (!alive) return;
        const rota = data?.routes?.[0];
        const coords = rota?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length) {
          setRouteGeo(coords.map(([lng, lat]) => [lat, lng]));
        }
        if (Number.isFinite(rota?.distance) && Number.isFinite(rota?.duration)) {
          // O OSRM calcula pra CARRO. Serve de estimativa pra moto, mas erra
          // pra bicicleta — por isso a tela mostra "~" e nunca um horário.
          routeInfoRef.current?.({
            km: rota.distance / 1000,
            min: Math.max(1, Math.round(rota.duration / 60)),
          });
        }
      })
      .catch(() => { if (alive) { setRouteGeo(null); routeInfoRef.current?.(null); } });
    return () => { alive = false; ctrl.abort(); };
  }, [dLat, dLng, tLat, tLng]);

  const routeLine = routeGeo || straightLine;
  const fitPoints = routeGeo || [driverCoords, destination];

  return (
    // isolate: cria um stacking context próprio pro mapa, senão os controles do
    // Leaflet (z-index ~1000) "furam" e ficam por cima dos modais da página.
    <div className="isolate w-full h-full">
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
      // Em tela cheia o mapa é FUNDO: os controles do Leaflet brigariam com os
      // botões flutuantes da página (e o +/- fica bem onde vai o chip de rota).
      zoomControl={!fullscreen}
      attributionControl={!fullscreen}
    >
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

      {/* resetKey = o destino. Muda quando a fase troca (restaurante -> cliente)
          e é aí, só aí, que faz sentido reenquadrar por conta própria. */}
      <FitBounds points={fitPoints} resetKey={`${phase}:${tLat},${tLng}`} />
    </MapContainer>
    </div>
  );
}

export default MapDisplay;
