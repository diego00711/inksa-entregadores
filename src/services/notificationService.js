// src/services/notificationService.js
// IMPORTANTE: Diego precisa preencher FIREBASE_CONFIG com credenciais do projeto Firebase
// console.firebase.google.com → projeto → Configurações → Adicionar app web
const FIREBASE_CONFIG = {
  // apiKey: "",
  // authDomain: "",
  // projectId: "",
  // storageBucket: "",
  // messagingSenderId: "",
  // appId: ""
};

const FCM_VAPID_KEY = ""; // Diego: preencha com chave VAPID do Firebase

export async function requestNotificationPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    if (!FIREBASE_CONFIG.apiKey) {
      console.warn('FCM: config ausente — preencha FIREBASE_CONFIG em notificationService.js');
      return null;
    }
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getMessaging, getToken } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js');
    const app = initializeApp(FIREBASE_CONFIG);
    const messaging = getMessaging(app);
    return await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
  } catch (e) {
    console.warn('FCM error:', e);
    return null;
  }
}

export async function saveFcmToken(token, apiBaseUrl, authHeaders) {
  if (!token) return;
  try {
    await fetch(`${apiBaseUrl}/api/profile/fcm-token`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcm_token: token, user_type: 'delivery' }),
    });
  } catch (e) {
    console.warn('FCM save error:', e);
  }
}
