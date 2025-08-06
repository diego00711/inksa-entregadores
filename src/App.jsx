// Ficheiro: src/App.jsx (VERSÃO FINAL COM ROTA DE GAMIFICAÇÃO)

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// --- Importações ---
import DeliveryPortalLayout from './components/delivery-portal/DeliveryPortalLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx'; 

import DeliveryDashboard from './pages/DeliveryDashboard.jsx'; 
import { LoginPage } from './pages/LoginPage.jsx';
import { MyDeliveriesPage } from './pages/MyDeliveriesPage.jsx';
import { EarningsPage } from './pages/EarningsPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx'; 

import RegisterPage from './pages/RegisterPage.jsx';
import DeliveryProfilePage from './pages/DeliveryProfilePage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import GamificationPage from './pages/GamificationPage.jsx'; // <-- NOVA IMPORTAÇÃO AQUI!

function App() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Rota Raiz: Redireciona para o dashboard */}
      <Route path="/" element={<Navigate to="/delivery/dashboard" replace />} />

      {/* Estrutura de Rotas Protegidas */}
      <Route 
        path="/delivery" 
        element={
          <ProtectedRoute>
            <DeliveryPortalLayout />
          </ProtectedRoute>
        } 
      >
        <Route path="dashboard" element={<DeliveryDashboard />} />
        <Route path="entregas" element={<MyDeliveriesPage />} />
        <Route path="ganhos" element={<EarningsPage />} />
        <Route path="meu-perfil" element={<DeliveryProfilePage />} />
        <Route path="gamificacao" element={<GamificationPage />} /> {/* <-- NOVA ROTA AQUI! */}
        
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Rota de Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;