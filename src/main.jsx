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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
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
