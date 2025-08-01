// Ficheiro: src/components/delivery-portal/DeliveryPortalLayout.jsx (VERSÃO FINAL E COMPLETA)

import React from 'react';
import { Outlet } from 'react-router-dom';
// O caminho para a Sidebar, assumindo que ela está em 'src/components/'
import { Sidebar } from '../Sidebar.jsx'; 

export default function DeliveryPortalLayout() {
  return (
    // Esta estrutura usa as classes do seu app.css para criar o layout
    <div className="portal-layout">
      <Sidebar />
      <main className="main-content">
        {/* O Outlet é onde as suas páginas (Dashboard, Entregas, etc.) serão renderizadas */}
        <Outlet />
      </main>
    </div>
  );
}