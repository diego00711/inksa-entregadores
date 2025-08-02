// Ficheiro: src/main.jsx (VERSÃO FINAL E CORRIGIDA)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Adicione esta linha para o estilo do mapa
import 'leaflet/dist/leaflet.css'; 

import App from './App';
import { DeliveryProfileProvider } from './context/DeliveryProfileContext';
import { ToastProvider } from './context/ToastContext'; // <-- NOVA IMPORTAÇÃO
import './app.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DeliveryProfileProvider>
        <ToastProvider> {/* <-- NOVO: Envolvendo o App com ToastProvider */}
          <App />
        </ToastProvider>
      </DeliveryProfileProvider>
    </BrowserRouter>
  </React.StrictMode>
);