// sw.js - Service Worker para PWA Inksa Entregadores
const CACHE_NAME = 'inksa-entregadores-v1.0.0';
const API_URL = 'https://inksa-auth-flask-dev.onrender.com';

// URLs para cache offline
const CACHE_URLS = [
  '/',
  '/delivery/dashboard',
  '/delivery/entregas', 
  '/delivery/ganhos',
  '/delivery/avaliacoes',
  '/delivery/gamificacao',
  '/delivery/meu-perfil',
  '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .catch((error) => {
        console.error('[SW] Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não HTTP
  if (!request.url.startsWith('http')) return;

  // Estratégias diferentes para diferentes tipos de requisição
  if (request.url.includes(API_URL) || request.url.includes('/api/')) {
    // Para API: Network First
    event.respondWith(networkFirst(request));
  } else if (request.destination === 'image') {
    // Para imagens: Cache First
    event.respondWith(cacheFirst(request));
  } else if (request.destination === 'document') {
    // Para páginas: Network First com fallback
    event.respondWith(networkFirstWithFallback(request));
  } else {
    // Para outros recursos: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Estratégia Network First (para API e páginas)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache');
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Estratégia Network First com fallback para páginas
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for page, trying cache');
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fallback para a página principal
    const fallbackResponse = await caches.match('/');
    return fallbackResponse || new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Estratégia Cache First (para imagens)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Image not available offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Estratégia Stale While Revalidate (para recursos estáticos)
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(CACHE_NAME);
      cache.then((c) => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Escutar mensagens do app principal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications (para futuras funcionalidades)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nova entrega disponível!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver Detalhes'
        },
        {
          action: 'close',
          title: 'Fechar'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Inksa Entregadores', options)
    );
  }
});

// Clique em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
