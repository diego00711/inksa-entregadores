// Ficheiro: src/components/delivery-portal/DeliveryPortalLayout.jsx (VERSÃO FINAL COM TAILWIND)

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar.jsx'; 

export default function DeliveryPortalLayout() {
  return (
    // ✅ CORREÇÃO APLICADA AQUI:
    // Usamos as classes do Tailwind para criar o layout de tela cheia.
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      {/* Esta 'main' agora controla a área de conteúdo e sua rolagem */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
