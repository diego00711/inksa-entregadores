// src/services/deliveryService.js (VERSÃO COMPLETA E CORRIGIDA)

import { DELIVERY_API_URL, processResponse, createAuthHeaders } from './api';

const DELIVERY_USER_DATA_KEY = 'deliveryUser';

const DeliveryService = {
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

  // ✅ FUNÇÃO PARA BUSCAR PEDIDOS PENDENTES (DISPONÍVEIS)
  async getPendingOrders() {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/pending`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data || [];
  },

  // ✅ FUNÇÃO PARA BUSCAR ENTREGAS POR STATUS
  async getDeliveriesByStatus(status = 'all') {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders?status=${status}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data || [];
  },

  // ✅ FUNÇÃO PARA BUSCAR DETALHES DE UM PEDIDO
  async getOrderDetail(orderId) {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/${orderId}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data || data;
  },

  // ✅ FUNÇÃO PARA ACEITAR PEDIDO
  async acceptDelivery(orderId) {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/${orderId}/accept`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({}),
    });
    const data = await processResponse(response);
    return data.data || data;
  },

  // ✅ FUNÇÃO PARA COMPLETAR ENTREGA
  async completeDelivery(orderId) {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/${orderId}/complete`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({}),
    });
    const data = await processResponse(response);
    return data.data || data;
  },
};

export default DeliveryService;
