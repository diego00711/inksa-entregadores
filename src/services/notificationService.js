// src/services/notificationService.js
//
// Mesma implementação do app Cliente (inksa-clientes). Os três apps caíam no
// mesmo buraco: getToken sem service worker registrado, catch que devolvia
// null e um saveFcmToken que ignorava a resposta do servidor.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA_DLxPwOxbhCSeQFs21GaK2sU51gaxJQ0",
  authDomain: "inksa-delivery.firebaseapp.com",
  projectId: "inksa-delivery",
  storageBucket: "inksa-delivery.firebasestorage.app",
  messagingSenderId: "2366391589",
  appId: "1:2366391589:web:7011af9ee2d7a3b355c6cc",
  measurementId: "G-5E4ND4JN1H"
};

const FCM_VAPID_KEY = "BOUov-X15lwK9B-Hd7er7rhnPZCzYxunkqEeeTo71A8gOxuCCQIEh_MQWNEOu7rxmIT4iaN9zim4FKurj2dwPAPc";

/**
 * Espera o service worker recém-registrado ficar ATIVO.
 *
 * getToken() chama pushManager.subscribe na registration; com o worker ainda
 * em 'installing' a inscrição falha de um jeito genérico.
 */
function esperarAtivar(registration, limiteMs = 10000) {
  if (registration.active) return Promise.resolve(registration);
  const sw = registration.installing || registration.waiting;
  if (!sw) return Promise.resolve(registration);
  return new Promise((resolve, reject) => {
    const relogio = setTimeout(
      () => reject(new Error('o service worker não ativou em 10s')),
      limiteMs,
    );
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated') { clearTimeout(relogio); resolve(registration); }
      if (sw.state === 'redundant') {
        clearTimeout(relogio);
        reject(new Error('o service worker virou redundante (outro SW tomou o escopo)'));
      }
    });
  });
}

/**
 * Obtém o token FCM devolvendo {token, erro}.
 *
 * O `catch` daqui antes devolvia só `null` — e a mensagem do Firebase, que diz
 * EXATAMENTE o que falhou (chave VAPID inválida, service worker não
 * registrado, domínio não autorizado no projeto), era jogada fora.
 */
export async function obterTokenFCM() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { token: null, erro: 'Este navegador não expõe a API de notificação.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { token: null, erro: `Permissão ${permission}.` };
  }

  if (!FIREBASE_CONFIG.apiKey) {
    return { token: null, erro: 'FIREBASE_CONFIG não preenchido no app.' };
  }

  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getMessaging, getToken, isSupported } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js');

    if (typeof isSupported === 'function' && !(await isSupported())) {
      return { token: null, erro: 'O Firebase não suporta notificações neste navegador/modo.' };
    }

    // ESCOPO SEPARADO: main.jsx já registra /sw.js (PWA) no escopo '/'. Dois
    // SCRIPTS diferentes no mesmo escopo não coexistem — o último registro
    // substitui o anterior, num revezamento em que o push nunca sobrevive.
    // Este é o escopo que o próprio Firebase usa internamente.
    let registration;
    try {
      registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
        { scope: '/firebase-cloud-messaging-push-scope' },
      );
      await esperarAtivar(registration);
    } catch (swErr) {
      return { token: null, erro: `Service worker não registrou: ${swErr?.message || swErr}` };
    }

    const app = (getApps && getApps().length) ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return { token: null, erro: 'O Firebase respondeu sem token.' };
    return { token, erro: null };
  } catch (e) {
    const detalhe = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    console.warn('FCM token error:', e);
    return { token: null, erro: detalhe };
  }
}

/** Compatibilidade: os chamadores antigos esperam o token ou null. */
export async function requestNotificationPermission() {
  const { token } = await obterTokenFCM();
  return token || null;
}

/**
 * Persiste o FCM token no backend do entregador. Devolve {ok, status, motivo}.
 *
 * Antes esta função IGNORAVA a resposta: 401, 404 e 500 passavam como sucesso
 * e o banco ficava vazio. Erro que se disfarça de sucesso some da lista de
 * problemas sem nunca ter sido resolvido.
 */
export async function saveFcmToken(token, apiBaseUrl, authHeaders) {
  if (!token) return { ok: false, motivo: 'Token não gerado.' };
  try {
    const r = await fetch(`${apiBaseUrl}/api/profile/fcm-token`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcm_token: token, user_type: 'delivery' }),
    });

    let corpo = null;
    try { corpo = await r.json(); } catch { /* sem corpo */ }

    if (!r.ok) {
      const detalhe = corpo?.error || corpo?.message || `HTTP ${r.status}`;
      console.warn('FCM save token falhou:', r.status, detalhe);
      return { ok: false, status: r.status, motivo: detalhe };
    }
    // A rota devolve 200 com success:false quando a coluna não existe.
    if (corpo && corpo.success === false) {
      return { ok: false, status: 200, motivo: corpo.warning || 'Servidor recusou o token.' };
    }
    return { ok: true };
  } catch (e) {
    console.warn('FCM save token error:', e);
    return { ok: false, motivo: 'Sem conexão com o servidor.' };
  }
}
