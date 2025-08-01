// Ficheiro: src/components/ProtectedRoute.jsx (VERSÃO FINAL E CORRIGIDA)

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// ✅ 1. IMPORTAÇÃO CORRIGIDA: Alteramos 'useDeliveryProfile' para o nome correto 'useProfile'.
import { useProfile } from '../context/DeliveryProfileContext.jsx'; 


export default function ProtectedRoute({ children }) {
  // ✅ 2. USO CORRETO DO HOOK: Usamos o nome correto da função.
  const { profile, loading: profileLoading, isAuthenticated } = useProfile();

  // A sua lógica para o estado de carregamento está excelente!
  // Ela evita que a página de login apareça rapidamente antes do redirecionamento.
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-lg font-medium text-gray-600">A verificar autenticação...</p>
      </div>
    );
  }

  // Após o carregamento, se não estiver autenticado, redireciona para o login.
  if (!isAuthenticated) { 
    return <Navigate to="/login" replace />; 
  }

  // Se tudo estiver certo, permite o acesso à rota protegida.
  return children ? children : <Outlet />;
}