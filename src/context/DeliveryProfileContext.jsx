// Ficheiro: src/context/DeliveryProfileContext.jsx (VERSÃO COM UPDATE)

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import  authService  from '../services/authService.js';
import DeliveryService from '../services/deliveryService.js';
import { obterTokenFCM, saveFcmToken } from '../services/notificationService.js';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api.js';

const DeliveryProfileContext = createContext(null);

export function useProfile() {
  return useContext(DeliveryProfileContext);
}

export function DeliveryProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Registra o aparelho pra receber push. Idempotente: salvar o mesmo token
   * de novo não faz mal, e o servidor sobrescreve.
   *
   * Precisa rodar TAMBÉM na retomada de sessão, não só no login. O entregador
   * abre o app já logado por semanas a fio — se o registro acontece apenas
   * dentro do login(), quem não deslogar nunca é perguntado. Era exatamente
   * essa a causa dos 6 entregadores com ZERO token: nenhum deles ia refazer
   * login só pra isso.
   */
  const registrarPush = useCallback(async () => {
    try {
      const { token, erro } = await obterTokenFCM();
      if (!token) {
        console.warn('Push: token não gerado —', erro);
        return;
      }
      const r = await saveFcmToken(token, DELIVERY_API_URL, createAuthHeaders());
      if (!r?.ok) console.warn('Push: servidor não salvou o token —', r?.motivo);
    } catch (e) {
      console.warn('Push: falha ao registrar (não bloqueia o app):', e);
    }
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (authService.isAuthenticated()) {
        try {
          const profileData = await DeliveryService.getDeliveryProfile();
          setProfile(profileData);
          setIsAuthenticated(true);
          registrarPush();
        } catch (error) {
          console.error("Sessão inválida. Realizando logout forçado.", error);
          authService.logout();
        }
      }
      setLoading(false);
    };
    checkAuthStatus();
  }, [registrarPush]);

  const login = async (email, password) => {
    await authService.login(email, password);
    const profileData = await DeliveryService.getDeliveryProfile();
    setProfile(profileData);
    setIsAuthenticated(true);

    await registrarPush();
    return profileData;
  };

  const logout = () => {
    authService.logout();
    setProfile(null);
    setIsAuthenticated(false);
  };

  // useCallback com identidade ESTÁVEL: esta função entra em arrays de
  // dependência de efeitos (DeliveryDashboard). Sem memoização, cada
  // setProfile re-renderizava o provider → nova função → efeitos re-rodavam →
  // novo updateProfile → novo setProfile... um laço que martelava o backend
  // com PUT /delivery/profile várias vezes por segundo (visto nos logs do E2E).
  const updateProfile = useCallback(async (profileData) => {
    const updatedProfile = await DeliveryService.updateDeliveryProfile(profileData);
    setProfile(updatedProfile); // Atualiza o perfil em toda a aplicação
    return updatedProfile;
  }, []);

  const value = {
    profile,
    loading,
    isAuthenticated,
    login,
    logout,
    updateProfile, // ✅ NOVO: Disponibilizamos a função para quem usar o contexto
  };

  return (
    <DeliveryProfileContext.Provider value={value}>
      {children}
    </DeliveryProfileContext.Provider>
  );
}
