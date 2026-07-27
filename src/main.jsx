// Ficheiro: src/main.jsx (VERSÃO SEM PWA - TESTE)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Adicione esta linha para o estilo do mapa
import 'leaflet/dist/leaflet.css'; 

import App from './App';
import { DeliveryProfileProvider } from './context/DeliveryProfileContext';
import { ToastProvider } from './context/ToastContext';
import './app.css'; 



// REGISTRO DO SERVICE WORKER - PWA
// SW so em producao: em dev ele intercepta fetches e atrapalha depuracao.
// IMPORTANTE: NAO recarregar o app sozinho (controllerchange) — isso podia
// recarregar no meio de uma entrega e dava TELA BRANCA. Aqui só mantemos o SW
// atualizado em background; o networkFirst já pega o index novo na navegacao.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      setInterval(() => { reg.update().catch(() => {}); }, 5 * 60 * 1000);
    }).catch(() => {});
  });
}

// Recuperação de "tela branca" após deploy: quando um index antigo tenta
// carregar um bundle que não existe mais (chunk removido no deploy novo), o
// import dinâmico falha e a tela fica branca. Aqui recarregamos UMA vez pra
// pegar o index novo — com trava de tempo pra nunca entrar em loop.
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem('preloadErrReloadAt')) || 0;
  if (Date.now() - last < 10000) return;
  sessionStorage.setItem('preloadErrReloadAt', String(Date.now()));
  window.location.reload();
});

// BEFORE INSTALL PROMPT - Detecta quando pode instalar como app
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DeliveryProfileProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </DeliveryProfileProvider>
    </BrowserRouter>
  </React.StrictMode>
);
