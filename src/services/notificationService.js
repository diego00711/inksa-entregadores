// src/services/notificationService.js
//
// DOIS CAMINHOS, um arquivo: navegador/PWA usa Web Push (VAPID + service
// worker); o APK instalado usa @capacitor/push-notifications (FCM nativo),
// porque o WebView do Android não implementa a Notification API.
import { Capacitor } from '@capacitor/core';
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

// Certificado push da Web do projeto inksa-delivery (par de chaves de
// 23/05/2026). Chave PÚBLICA — pode ficar no bundle, é isso que o navegador
// manda pro serviço de push.
const FCM_VAPID_KEY = "BOUov-X15lwK9B-Hd7er7rhnPZCzYxunkqEeTo71A8gOxuCCQlEh_MQWNEOu7rxmlT4iaN9zim4FKurj2dwPAPc";

/** Roda dentro do APK/IPA (Capacitor), e não no navegador. */
export function ehAppNativo() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Token FCM pelo caminho NATIVO (@capacitor/push-notifications).
 *
 * Sem chave VAPID e sem service worker: o token vem do FCM do Android, e o
 * que amarra o app ao projeto Firebase é o `android/app/google-services.json`.
 * Sem esse arquivo no APK, o register() dispara `registrationError` — ou não
 * responde nunca, daí o timeout com mensagem própria em vez de tela girando.
 */
async function obterTokenNativo() {
  let PushNotifications;
  try {
    ({ PushNotifications } = await import('@capacitor/push-notifications'));
  } catch (e) {
    return { token: null, erro: `Plugin de push ausente neste APK: ${e?.message || e}` };
  }

  try {
    let perm = await PushNotifications.checkPermissions();
    // Android 13+ exige permissão em tempo de execução (POST_NOTIFICATIONS).
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      return { token: null, erro: `Permissão ${perm.receive}.` };
    }
  } catch (e) {
    return { token: null, erro: `Falha ao pedir permissão: ${e?.message || e}` };
  }

  let resolver;
  const espera = new Promise((r) => { resolver = r; });
  const inscricoes = [];
  let respondido = false;

  const finalizar = (resultado) => {
    if (respondido) return;
    respondido = true;
    clearTimeout(relogio);
    inscricoes.forEach((h) => { try { h.remove(); } catch { /* já removido */ } });
    resolver(resultado);
  };

  const relogio = setTimeout(() => finalizar({
    token: null,
    erro: 'o FCM não respondeu em 15s — normalmente é google-services.json ausente no APK.',
  }), 15000);

  try {
    inscricoes.push(await PushNotifications.addListener(
      'registration', (t) => finalizar({ token: t?.value || null, erro: t?.value ? null : 'registro sem token.' }),
    ));
    inscricoes.push(await PushNotifications.addListener(
      'registrationError', (e) => finalizar({ token: null, erro: `registro nativo falhou: ${e?.error || JSON.stringify(e)}` }),
    ));
    await PushNotifications.register();
  } catch (e) {
    finalizar({ token: null, erro: e?.message || String(e) });
  }

  return espera;
}

/** Estado da permissão no app instalado: 'granted' | 'denied' | 'prompt' | null. */
export async function estadoPermissaoNativa() {
  if (!ehAppNativo()) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const p = await PushNotifications.checkPermissions();
    return p?.receive || null;
  } catch {
    return null;
  }
}

/** Tocar na notificação abre as Entregas, não a home. */
let listenersDeAcaoProntos = false;
export async function configurarAcoesDePush(navegarPara) {
  if (!ehAppNativo() || listenersDeAcaoProntos) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.addListener('pushNotificationActionPerformed', (acao) => {
      const d = acao?.notification?.data || {};
      const destino = d.url || '/delivery/entregas';
      try { navegarPara(destino); } catch { window.location.href = destino; }
    });
    listenersDeAcaoProntos = true;
  } catch (e) {
    console.warn('Push: não consegui registrar o listener de toque:', e);
  }
}

/**
 * Confere o FORMATO da chave VAPID antes de usar. Devolve null se está boa,
 * ou a descrição do defeito.
 *
 * Existe porque a chave que ficou aqui por semanas era inválida: 88
 * caracteres em vez de 87, decodificando em 66 bytes em vez de 65. O
 * navegador só reclamava lá no fim, com "applicationServerKey must contain a
 * valid P-256 public key" — depois de pedir permissão, registrar service
 * worker e falar com o Firebase. Erro de configuração tem que aparecer no
 * primeiro passo, não no último.
 *
 * VAPID válida = ponto P-256 não comprimido: 65 bytes (0x04 + X32 + Y32),
 * que em base64url sem padding dá exatamente 87 caracteres.
 */
function defeitoDaChaveVapid(k) {
  if (typeof k !== 'string' || !k) return 'está vazia';
  if (k.length !== 87) return `tem ${k.length} caracteres (o correto são 87)`;
  let bin;
  try {
    bin = atob(k.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return 'não é base64url válido';
  }
  if (bin.length !== 65) return `decodifica em ${bin.length} bytes (o correto são 65)`;
  if (bin.charCodeAt(0) !== 0x04) return 'não começa com o byte 0x04 de chave pública não comprimida';
  return null;
}

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
  // No APK instalado o caminho web NUNCA funciona — o WebView não tem a
  // Notification API. Desviar aqui, antes de qualquer checagem de navegador.
  if (ehAppNativo()) return obterTokenNativo();

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

  const defeito = defeitoDaChaveVapid(FCM_VAPID_KEY);
  if (defeito) {
    return {
      token: null,
      erro: `a chave VAPID do app ${defeito}. Copie de novo em Firebase → `
          + 'Configurações do projeto → Cloud Messaging → Certificados push da Web.',
    };
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

/**
 * Cria o canal URGENTE do Android — o que faz o aparelho TOCAR ALTO e mostrar
 * o aviso por cima de outro app.
 *
 * POR QUE ISTO PRECISA EXISTIR NO APP, E NÃO SÓ NO SERVIDOR
 * No Android 8+ quem manda no som, na vibração e no heads-up é o CANAL, e o
 * canal é criado pelo APP. O servidor pode mandar `sound` e `channel_id` à
 * vontade: se o canal não existir aqui, o Android joga tudo no canal padrão,
 * que é silencioso. Era exatamente esse o caso — nenhum canal era criado em
 * lugar nenhum, e por isso o pedido chegava mudo com o app em segundo plano.
 *
 * IMPORTANCE 5 = MAX: som + vibração + aparece por cima do que estiver aberto.
 * É o que faz o aviso competir com o iFood na mesma tela.
 *
 * ⚠️ O id tem que bater com CANAL_URGENTE do notification_service.py.
 *
 * ⚠️ ANDROID NÃO DEIXA MUDAR CANAL DEPOIS DE CRIADO. Volume, som e importância
 * ficam congelados na primeira criação — e passam a pertencer ao usuário, nas
 * configurações do sistema. Para mudar qualquer um deles é preciso criar um
 * canal com id NOVO (ex.: inksa_urgente_v2). Trocar só o texto daqui não faz
 * absolutamente nada em quem já abriu o app uma vez.
 */
export async function criarCanalUrgente() {
  if (!Capacitor.isNativePlatform()) return; // no navegador não existe canal
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.createChannel({
      id: 'inksa_urgente',
      name: 'Pedidos e entregas',
      description: 'Avisos que exigem ação imediata. Toca alto mesmo com outro app aberto.',
      importance: 5,   // MAX — heads-up + som
      visibility: 1,   // aparece na tela de bloqueio
      sound: 'default',
      vibration: true,
      lights: true,
    });
  } catch {
    // Plugin ausente ou versão antiga do Android: segue sem canal. O push
    // ainda chega, só que no canal padrão (silencioso).
  }
}
