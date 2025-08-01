// Ficheiro: src/main.jsx (VERSÃO FINAL CORRIGIDA)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Adicione esta linha para o estilo do mapa
import 'leaflet/dist/leaflet.css'; 

import App from './App';
import { DeliveryProfileProvider } from './context/DeliveryProfileContext';
import './app.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DeliveryProfileProvider>
        <App />
      </DeliveryProfileProvider>
    </BrowserRouter>
  </React.StrictMode>
);