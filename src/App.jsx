// Ficheiro: src/App.jsx (VERSÃO FINAL COM ROTA DE GAMIFICAÇÃO E AVALIAÇÕES)

import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useToast } from './context/ToastContext';
import { useProfile } from './context/DeliveryProfileContext.jsx';
import GlobalError from './components/GlobalError';
import { useOnlineStatus } from './hooks/useOnlineStatus';

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
import GamificationPage from './pages/GamificationPage.jsx'; // Gamificação
import DeliverymanEvaluationsCenter from './pages/DeliverymanEvaluationsCenter.jsx'; // <-- NOVA IMPORTAÇÃO

// --- Onboarding ---
import OnboardingSlides from './components/onboarding/OnboardingSlides.jsx';
import GuidedTour from './components/onboarding/GuidedTour.jsx';

function App() {
  const navigate = useNavigate();
  const addToast = useToast();
  const { isAuthenticated, loading: profileLoading } = useProfile();

  // Onboarding: mostrar se ainda não foi visto
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('inksa_onboarding_done') !== 'true'
  );

  // Tour guiado: mostrar após login, se ainda não foi visto
  const [showTour, setShowTour] = useState(false);

  // Detectar transição para autenticado e disparar tour
  useEffect(() => {
    if (!profileLoading && isAuthenticated && localStorage.getItem('inksa_tour_done') !== 'true') {
      setShowTour(true);
    }
  }, [isAuthenticated, profileLoading]);

  useEffect(() => {
    const handleUnauthorized = () => {
      addToast('Sessão expirada, faça login novamente', 'error');
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [navigate, addToast]);

  // Online/Offline status
  const isOnline = useOnlineStatus();
  const wasOnlineRef = useRef(null);
  useEffect(() => {
    if (wasOnlineRef.current === null) { wasOnlineRef.current = isOnline; return; }
    if (isOnline && !wasOnlineRef.current) addToast('Conexão restaurada', 'success');
    if (!isOnline && wasOnlineRef.current) addToast('Você está offline', 'error');
    wasOnlineRef.current = isOnline;
  }, [isOnline, addToast]);

  return (
    <>
      <GlobalError />
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
          <Route path="gamificacao" element={<GamificationPage />} />
          <Route path="avaliacoes" element={<DeliverymanEvaluationsCenter />} /> {/* <-- NOVA ROTA AQUI! */}

          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Rota de Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Onboarding sobreposto — aparece antes do login, z-50 */}
      {showOnboarding && (
        <OnboardingSlides
          onComplete={() => {
            localStorage.setItem('inksa_onboarding_done', 'true');
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Tour guiado — aparece após login, z-40/z-50 */}
      {showTour && (
        <GuidedTour
          onComplete={() => {
            localStorage.setItem('inksa_tour_done', 'true');
            setShowTour(false);
          }}
        />
      )}
    </>
  );
}

export default App;
