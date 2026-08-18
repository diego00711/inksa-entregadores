/* sw.js — Service Worker para PWA Inksa Entregadores
   Estratégias de cache otimizadas + proteção para chamadas POST/PUT/PATCH/DELETE
*/
// Bump de versão força o SW a reinstalar e apagar os caches antigos no próximo
// carregamento (o activate deleta tudo != CACHE_NAME). Suba este número a cada
// release em que precise garantir que o app pegue a versão nova na hora.
const CACHE_NAME = 'inksa-entregadores-v1.0.37';
const API_URL = 'https://inksa-auth-flask-dev.onrender.com';

// =========== Install ===========
// NAO pre-cacheia rotas: um index congelado no install aponta para bundles antigos
// que saem do ar a cada deploy — causava tela travada no carregamento.
// O index e cacheado (e atualizado) a cada navegacao com rede em networkFirstWithFallback.
self.addEventListener('install', (event) => {
  console.log('[SW] install');
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
// SEM listener de `push` aqui, de proposito. Quem recebe push e a
// registration do FCM (firebase-messaging-sw.js, no escopo dele) —
// ninguem chama pushManager.subscribe neste worker, entao este listener
// era codigo morto. Pior: dois workers capazes de desenhar notificacao e
// uma armadilha, porque no dia em que alguem inscrever este aqui, volta a
// aparecer notificacao duplicada — e o motivo estaria em outro arquivo.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('/'));
  }
});

// Keep-alive: pinga o backend a cada 10 min para evitar cold start no Render
setInterval(() => {
  fetch(API_URL + '/api/health', { cache: 'no-store' }).catch(() => {});
}, 10 * 60 * 1000);
