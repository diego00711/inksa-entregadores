import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Adicione esta linha para o estilo do mapa
import 'leaflet/dist/leaflet.css'; 

import App from './App';
import { DeliveryProfileProvider } from './context/DeliveryProfileContext';
import { ToastProvider } from './context/ToastContext';
import './app.css'; // ✅ CORRETO: usar o app.css que já existe

// REGISTRO DO SERVICE WORKER - PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW Entregador registered successfully:', registration);
      })
      .catch((error) => {
        console.log('SW Entregador registration failed:', error);
      });
  });
}

// BEFORE INSTALL PROMPT - Detecta quando pode instalar como app
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt fired - App Entregador pode ser instalado!');
  e.preventDefault();
  deferredPrompt = e;
});

// DETECTAR QUANDO FOI INSTALADO
window.addEventListener('appinstalled', (evt) => {
  console.log('App Entregador foi instalado com sucesso!');
});

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
