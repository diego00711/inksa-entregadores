// Ficheiro: src/context/DeliveryProfileContext.jsx (VERSÃO COM UPDATE)

import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService.js';
import DeliveryService from '../services/deliveryService.js';

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
    return profileData;
  };

  const logout = () => {
    authService.logout();
    setProfile(null);
    setIsAuthenticated(false);
  };

  // ✅ NOVO: Função para atualizar o perfil
  // Ela recebe os novos dados, chama o serviço e atualiza o estado local.
  const updateProfile = async (profileData) => {
    const updatedProfile = await DeliveryService.updateDeliveryProfile(profileData);
    setProfile(updatedProfile); // Atualiza o perfil em toda a aplicação
    return updatedProfile;
  };

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