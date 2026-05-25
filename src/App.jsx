import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useToast } from './context/ToastContext';
import { useProfile } from './context/DeliveryProfileContext.jsx';
import GlobalError from './components/GlobalError';
import { useOnlineStatus } from './hooks/useOnlineStatus';

// --- Components (NOT lazy) ---
import DeliveryPortalLayout from './components/delivery-portal/DeliveryPortalLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import OnboardingSlides from './components/onboarding/OnboardingSlides.jsx';
import GuidedTour from './components/onboarding/GuidedTour.jsx';
import WakingUpScreen from './components/WakingUpScreen.jsx';
import SupportButton from './components/SupportButton.jsx';

// --- Lazy-loaded pages ---
const DeliveryDashboard = lazy(() => import('./pages/DeliveryDashboard.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx').then(m => ({ default: m.LoginPage })));
const MyDeliveriesPage = lazy(() => import('./pages/MyDeliveriesPage.jsx').then(m => ({ default: m.MyDeliveriesPage })));
const EarningsPage = lazy(() => import('./pages/EarningsPage.jsx').then(m => ({ default: m.EarningsPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx').then(m => ({ default: m.ResetPasswordPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const DeliveryProfilePage = lazy(() => import('./pages/DeliveryProfilePage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const GamificationPage = lazy(() => import('./pages/GamificationPage.jsx'));
const DeliverymanEvaluationsCenter = lazy(() => import('./pages/DeliverymanEvaluationsCenter.jsx'));

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
  </div>
);

function App() {
  const navigate = useNavigate();
  const addToast = useToast();
  const { isAuthenticated, loading: profileLoading } = useProfile();
  const [serverReady, setServerReady] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('inksa_onboarding_done') !== 'true'
  );
  const [showTour, setShowTour] = useState(false);

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
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate, addToast]);

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
      <WakingUpScreen onReady={() => setServerReady(true)} />
      {serverReady && (
        <>
          <GlobalError />
          <SupportButton />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

              <Route path="/" element={<Navigate to="/delivery/dashboard" replace />} />

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
                <Route path="avaliacoes" element={<DeliverymanEvaluationsCenter />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>

          {showOnboarding && (
            <OnboardingSlides
              onComplete={() => {
                localStorage.setItem('inksa_onboarding_done', 'true');
                setShowOnboarding(false);
              }}
            />
          )}
          {showTour && (
            <GuidedTour
              onComplete={() => {
                localStorage.setItem('inksa_tour_done', 'true');
                setShowTour(false);
              }}
            />
          )}
        </>
      )}
    </>
  );
}

export default App;
