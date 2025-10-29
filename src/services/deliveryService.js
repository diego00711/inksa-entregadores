// src/services/deliveryService.js (ENTREGADOR) — ALINHADO AO BACKEND ATUAL

import { DELIVERY_API_URL, processResponse, createAuthHeaders } from './api';

const DELIVERY_USER_DATA_KEY = 'deliveryUser';

const DeliveryService = {
  // -------- Perfil / Avatar / Stats (mantidos como estavam) --------
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
    if (userStr && data?.data) {
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
    const qs = params.toString();
    const url = `${DELIVERY_API_URL}/api/delivery/stats/earnings-history${qs ? `?${qs}` : ''}`;
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
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/upload-avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await processResponse(response);

    const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
    if (userStr && data?.avatar_url) {
      const currentUserData = JSON.parse(userStr);
      const updatedUserData = { ...currentUserData, avatar_url: data.avatar_url };
      localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
    }
    return data.avatar_url || data;
  },

  // ----------------------------------------------------------------
  //                    ROTAS DE PEDIDOS (ENTREGADOR)
  // ----------------------------------------------------------------

  /**
   * Retorna pedidos disponíveis para o entregador:
   *   - status 'ready' e delivery_id IS NULL
   *   - status 'accepted_by_delivery' e delivery_id IS NULL
   * Endpoint: GET /api/orders/available
   */
  async getAvailableDeliveries() {
    const response = await fetch(`${DELIVERY_API_URL}/api/orders/available`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    // backend retorna array direto
    return Array.isArray(data) ? data : (data?.data || []);
  },

  /**
   * Aceitar um pedido disponível.
   * Endpoint: POST /api/orders/:orderId/accept
   */
  async acceptDelivery(orderId) {
    const response = await fetch(`${DELIVERY_API_URL}/api/orders/${orderId}/accept`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({}), // sem payload adicional
    });
    const data = await processResponse(response);
    return data?.order || data; // nosso backend responde {status, message, order}
  },

  /**
   * Buscar detalhe do pedido (se a UI precisar).
   * Endpoint: GET /api/orders/:orderId
   * (Se não existir no backend, pode remover/ajustar conforme necessário.)
   */
  async getOrderDetail(orderId) {
    const response = await fetch(`${DELIVERY_API_URL}/api/orders/${orderId}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data?.data || data;
  },

  /**
   * Confirmar retirada no restaurante (precisa do código de retirada).
   * Endpoint: POST /api/orders/:orderId/pickup
   * Body esperado: { pickup_code: "ABCD" }
   */
  async confirmPickup(orderId, pickupCode) {
    const response = await fetch(`${DELIVERY_API_URL}/api/orders/${orderId}/pickup`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ pickup_code: String(pickupCode || '').trim().toUpperCase() }),
    });
    const data = await processResponse(response);
    return data;
  },

  /**
   * Completar entrega (precisa do código de entrega).
   * Endpoint: POST /api/orders/:orderId/complete
   * Body esperado: { delivery_code: "WXYZ" }
   */
  async completeDelivery(orderId, deliveryCode) {
    const response = await fetch(`${DELIVERY_API_URL}/api/orders/${orderId}/complete`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ delivery_code: String(deliveryCode || '').trim().toUpperCase() }),
    });
    const data = await processResponse(response);
    return data;
  },

  // ---- Rotas antigas opcionais (se alguma tela usa) ----------------
  // Mantidas como NO-OPs/aliases para não quebrar importações antigas.
  async getPendingOrders() {
    // Mantém compatibilidade, mas agora reusa a rota correta
    return this.getAvailableDeliveries();
  },

  async getDeliveriesByStatus() {
    // Se você não tiver rotas específicas por status, remova este método
    // ou implemente futuramente conforme necessidade.
    return [];
  },
};

export default DeliveryService;
