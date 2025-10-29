/* sw.js — Service Worker para PWA Inksa Entregadores
   Estratégias de cache otimizadas + proteção para chamadas POST/PUT/PATCH/DELETE
*/
const CACHE_NAME = 'inksa-entregadores-v1.0.1';
const API_URL = 'https://inksa-auth-flask-dev.onrender.com';

// Rotas base para funcionar offline (app shell)
const CACHE_URLS = [
  '/',
  '/delivery/dashboard',
  '/delivery/entregas',
  '/delivery/ganhos',
  '/delivery/avaliacoes',
  '/delivery/gamificacao',
  '/delivery/meu-perfil',
  '/manifest.json',
];

// =========== Install ===========
self.addEventListener('install', (event) => {
  console.log('[SW] install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_URLS))
      .catch((err) => console.error('[SW] install cache error:', err))
  );
  self.skipWaiting();
});

// =========== Activate ===========
self.addEventListener('activate', (event) => {
  console.log('[SW] activate');
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => (name !== CACHE_NAME ? caches.delete(name) : undefined))
      );
      // Navigation preload (quando disponível) melhora tempo de resposta
      if ('navigationPreload' in self.registration) {
        try { await self.registration.navigationPreload.enable(); } catch {}
      }
    })()
  );
  self.clients.claim();
});

// =========== Fetch ===========
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Só lida com requisições http(s)
  if (!request.url.startsWith('http')) return;

  // 🚫 Não interceptar requisições com efeitos colaterais
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    // Deixa seguir direto para a rede (sem respondWith)
    return;
  }

  // API → Network First
  if (request.url.includes(API_URL) || request.url.includes('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Imagens → Cache First
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Documentos (páginas) → Network First c/ fallback
  if (request.destination === 'document') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Demais estáticos → Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// =========== Estratégias ===========
async function networkFirst(request) {
  try {
    const preload = await getPreloadedResponse();
    if (preload) return preload;

    const net = await fetch(request);
    if (net && net.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, net.clone());
    }
    return net;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const preload = await getPreloadedResponse();
    if (preload) return preload;

    const net = await fetch(request);
    if (net && net.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match('/');
    return fallback || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const net = await fetch(request);
    if (net && net.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    return new Response('Image not available offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((net) => {
      if (net && net.ok) {
        caches.open(CACHE_NAME).then((c) => c.put(request, net.clone()));
      }
      return net;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// Navigation Preload helper
async function getPreloadedResponse() {
  try {
    if ('preloadResponse' in self) {
      const response = await self.preloadResponse;
      return response || null;
    }
  } catch {}
  return null;
}

// =========== Mensagens ===========
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING');
    self.skipWaiting();
  }
});

// =========== Push (futuro) ===========
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.title || 'Inksa Entregadores';
  const options = {
    body: data.body || 'Nova entrega disponível!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { dateOfArrival: Date.now(), primaryKey: 1 },
    actions: [
      { action: 'explore', title: 'Ver Detalhes' },
      { action: 'close', title: 'Fechar' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('/'));
  }
});
