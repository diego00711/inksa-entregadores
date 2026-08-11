/* firebase-messaging-sw.js — service worker do Firebase Cloud Messaging.
 *
 * O `getToken()` do FCM exige um service worker com EXATAMENTE este nome na
 * raiz do site. Sem ele o getToken lança, o `catch` do notificationService
 * devolve null em silêncio e nenhum token é salvo — era por isso que havia
 * ZERO tokens no banco e todo push do backend morria sem enviar nada.
 *
 * ⚠️ Web Push não funciona no WebView do Android (APK instalado). Isto cobre
 * navegador e PWA. Pro app instalado: @capacitor/push-notifications +
 * google-services.json + AAB novo.
 */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA_DLxPwOxbhCSeQFs21GaK2sU51gaxJQ0",
  authDomain: "inksa-delivery.firebaseapp.com",
  projectId: "inksa-delivery",
  storageBucket: "inksa-delivery.firebasestorage.app",
  messagingSenderId: "2366391589",
  appId: "1:2366391589:web:7011af9ee2d7a3b355c6cc",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const d = payload.data || {};
  self.registration.showNotification(n.title || 'Inksa Entregador', {
    body: n.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: d.order_id || d.tag || 'inksa-entregador',
    // Oferta de entrega expira em ~30s: tem que ficar na tela até ele ver.
    requireInteraction: d.type === 'new_delivery',
    data: d,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const destino = d.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(destino);
          return c.focus();
        }
      }
      return clients.openWindow(destino);
    })
  );
});
