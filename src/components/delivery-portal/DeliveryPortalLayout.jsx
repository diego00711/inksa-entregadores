// src/components/delivery-portal/DeliveryPortalLayout.jsx - VERSÃO ULTRA SIMPLES

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar.jsx';

export default function DeliveryPortalLayout() {
  const [showContent, setShowContent] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Botão Mobile - só aparece em telas pequenas */}
      <button 
        onClick={() => setShowContent(!showContent)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 9999,
          padding: '10px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          display: window.innerWidth <= 768 ? 'block' : 'none'
        }}
      >
        {showContent ? '← Menu' : 'Dashboard →'}
      </button>

      {/* Sidebar */}
      <div style={{
        width: window.innerWidth <= 768 ? (showContent ? '0px' : '100%') : '260px',
        display: window.innerWidth <= 768 ? (showContent ? 'none' : 'block') : 'block',
        transition: 'all 0.3s ease'
      }}>
        <Sidebar />
      </div>

      {/* Conteúdo Principal */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '20px',
        display: window.innerWidth <= 768 ? (showContent ? 'block' : 'none') : 'block'
      }}>
        <Outlet />
      </main>
    </div>
  );
}
