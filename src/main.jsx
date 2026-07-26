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
// Auto-update: o app do entregador fica aberto o turno todo, então quando sai
// um deploy novo o SW antigo continuava servindo a versao velha ate o usuario
// fechar tudo e limpar cache. Agora checamos update periodicamente e, quando um
// SW novo assume o controle, recarregamos UMA vez pra pegar os bundles novos.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Procura versao nova de tempos em tempos (app aberto por horas).
      setInterval(() => { reg.update().catch(() => {}); }, 60 * 1000);
    }).catch(() => {});
  });
}

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
