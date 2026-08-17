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

// ── Estilo do mapa ─────────────────────────────────────────────────────────
// O estilo padrão do OpenStreetMap é a cara de 2010: fundo bege, rótulo de rua
// em cima de rótulo de rua, estrada amarela grossa. Ao lado do concorrente
// (que usa Google Maps) parece app velho — e isso é cartografia, não layout.
//
// Trocar é UMA variável de ambiente. Não existe basemap moderno gratuito pra
// uso comercial: os da CARTO são "exclusively with an Enterprise license", e
// o plano grátis do Stadia/MapTiler é só pra desenvolvimento e avaliação.
// Por isso o padrão aqui continua o OSM: funciona sem chave e sem mentira.
//
// Pra ligar o estilo moderno, basta definir no Vercel:
//   VITE_MAP_TILE_URL = https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=SUA_CHAVE
//   VITE_MAP_ATTRIBUTION = &copy; Stadia Maps &copy; OpenStreetMap
// Nenhum código muda.
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL
  || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = import.meta.env.VITE_MAP_ATTRIBUTION
  || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// ── Marcadores ─────────────────────────────────────────────────────────────
// A chincheta azul padrão do Leaflet é metade do "cara de app velho". Estes
// são desenhados: o entregador é um ponto (posição exata), a loja e o cliente
// são alfinetes com cor própria, então dá pra saber quem é quem sem tocar.
// Ponto simples: usado quando NÃO se sabe o veículo. Hoje 2 dos 6 entregadores
// estão com vehicle_type em branco — desenhar uma moto pra quem está de
// bicicleta seria inventar informação num mapa, que é o pior lugar pra isso.
const driverIcon = L.divIcon({
  className: '',
  html:
    '<div style="width:20px;height:20px;border-radius:50%;background:#2563EB;' +
    'border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35),0 0 0 6px rgba(37,99,235,.20)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Quando o veículo é conhecido, ele vira o marcador — como no app do
// concorrente. Os apelidos legados ('motorcycle', 'car') entram porque o
// CHECK da tabela ainda os aceita e ignorá-los faria a moto virar bolinha.
const VEICULOS = {
  bicicleta: '🚲', bike: '🚲',
  moto: '🛵', motorcycle: '🛵',
  carro: '🚗', car: '🚗',
  utilitario: '🚐',
};
const iconeDoVeiculo = (tipo) => {
  const emoji = VEICULOS[String(tipo || '').trim().toLowerCase()];
  if (!emoji) return driverIcon;
  return L.divIcon({
    className: '',
    html:
      '<div style="width:38px;height:38px;border-radius:50%;background:#fff;' +
      'border:3px solid #2563EB;box-shadow:0 2px 8px rgba(0,0,0,.35),0 0 0 6px rgba(37,99,235,.18);' +
      `display:flex;align-items:center;justify-content:center;font-size:19px;line-height:1">${emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

// Alfinete: círculo colorido com um "bico" embaixo apontando o ponto exato.
const alfinete = (cor, emoji) => L.divIcon({
  className: '',
  html:
    `<div style="position:relative;width:34px;height:42px">` +
      `<div style="width:34px;height:34px;border-radius:50%;background:${cor};` +
        `border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);` +
        `display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1">${emoji}</div>` +
      `<div style="position:absolute;left:50%;top:30px;transform:translateX(-50%);` +
        `width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;` +
        `border-top:10px solid ${cor}"></div>` +
    `</div>`,
  iconSize: [34, 42],
  iconAnchor: [17, 42],
});
const lojaIcon = alfinete('#FF6F00', '🏪');
const clienteIcon = alfinete('#16A34A', '🏠');

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
  fullscreen = false, onRouteInfo, vehicle,
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
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />

      {pickupCoords && (
        <Marker position={pickupCoords} icon={lojaIcon}>
          <Popup>Loja (retirada)</Popup>
        </Marker>
      )}
      {deliveryCoords && (
        <Marker position={deliveryCoords} icon={clienteIcon}>
          <Popup>Cliente (entrega)</Popup>
        </Marker>
      )}
      {driverCoords && (
        <Marker position={driverCoords} icon={iconeDoVeiculo(vehicle)}>
          <Popup>Você está aqui</Popup>
        </Marker>
      )}

      {/* Duas linhas, não uma: a branca embaixo faz o contorno. É o truque que
          deixa a rota legível por cima de rua clara E de quarteirão escuro —
          sem ele, a linha laranja some quando passa sobre avenida amarela.
          Só no traçado real; no palpite em linha reta seria enfeite. */}
      {routeLine && routeGeo && (
        <Polyline
          positions={routeLine}
          pathOptions={{ color: '#ffffff', weight: 11, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
        />
      )}
      {routeLine && (
        <Polyline
          positions={routeLine}
          pathOptions={{
            color: '#FF6B35',
            weight: routeGeo ? 6 : 4,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: routeGeo ? null : '8 10',
          }}
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
