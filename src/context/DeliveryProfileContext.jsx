// Ficheiro: src/context/DeliveryProfileContext.jsx (VERSÃO COM UPDATE)

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import  authService  from '../services/authService.js';
import DeliveryService from '../services/deliveryService.js';
import { requestNotificationPermission, saveFcmToken } from '../services/notificationService.js';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api.js';

const DeliveryProfileContext = createContext(null);

export function useProfile() {
  return useContext(DeliveryProfileContext);
}

export function DeliveryProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (authService.isAuthenticated()) {
        try {
          const profileData = await DeliveryService.getDeliveryProfile();
          setProfile(profileData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Sessão inválida. Realizando logout forçado.", error);
          authService.logout();
        }
      }
      setLoading(false);
    };
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    await authService.login(email, password);
    const profileData = await DeliveryService.getDeliveryProfile();
    setProfile(profileData);
    setIsAuthenticated(true);

    // FCM: solicita permissão e salva token — falha silenciosa
    try {
      const fcmToken = await requestNotificationPermission();
      await saveFcmToken(fcmToken, DELIVERY_API_URL, createAuthHeaders());
    } catch (fcmErr) {
      console.warn('FCM init error (non-blocking):', fcmErr);
    }

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
