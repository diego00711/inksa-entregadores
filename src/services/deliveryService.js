// src/services/deliveryService.js (VERSÃO COMPLETA E CORRIGIDA)

import { DELIVERY_API_URL, processResponse, createAuthHeaders } from './api';

const DELIVERY_USER_DATA_KEY = 'deliveryUser';

const DeliveryService = {
  /**
   * ✅ NOVO: Busca as entregas disponíveis (pedidos com status 'ready').
   * Chama o novo endpoint que criamos no backend.
   */
  async getAvailableDeliveries() {
    try {
      const response = await fetch(`${DELIVERY_API_URL}/api/orders/available`, {
        method: 'GET',
        headers: createAuthHeaders(),
      });
      const data = await processResponse(response);
      // A API retorna um array diretamente, então podemos retorná-lo.
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao buscar entregas disponíveis:', error);
      // Retorna um array vazio em caso de erro para não quebrar a UI.
      return [];
    }
  },

  async getDeliveryProfile() {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/profile`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data || data;
  },

  async updateDeliveryProfile(profileData) {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/profile`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    const data = await processResponse(response);
    
    const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
    if (userStr && data.data) {
      const currentUserData = JSON.parse(userStr);
      const updatedUserData = { ...currentUserData, ...data.data }; 
      localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
    }
    return data.data || data;
  },

  async getDashboardStats() { 
    const url = `${DELIVERY_API_URL}/api/delivery/stats/dashboard-stats`;
    const response = await fetch(url, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data || data;
  },

  async getEarningsHistory(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    const url = `${DELIVERY_API_URL}/api/delivery/stats/earnings-history${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data || {};
  },

  async uploadDeliveryAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const token = localStorage.getItem('deliveryAuthToken');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/upload-avatar`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    
    const data = await processResponse(response);
    
    const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
    if (userStr && data.avatar_url) {
      const currentUserData = JSON.parse(userStr);
      const updatedUserData = { ...currentUserData, avatar_url: data.avatar_url };
      localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
    }
    return data.avatar_url || data;
  },
};

export default DeliveryService;
