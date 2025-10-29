// src/services/orderService.js – VERSÃO COMPLETA (OK p/ código de entrega)

const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

// Token do entregador (fallback para 'token' se necessário)
const getAuthToken = () =>
  localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token');

// Wrapper de fetch autenticado
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error('Token de autenticação não encontrado');

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Erro na requisição:', {
      url,
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Erro HTTP! Status: ${response.status}`);
  }
  return response.json();
};

// Aceitar pedido (entregador)
export const acceptDelivery = async (orderId) => {
  console.log('🚀 Aceitando pedido:', orderId);
  const data = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/accept`, {
    method: 'POST',
  });
  console.log('✅ Pedido aceito:', data);
  return data;
};

// Retirar pedido (precisa do pickup_code)
export const pickupOrder = async (orderId, pickupCode) => {
  console.log('📦 Retirando pedido:', orderId);
  const data = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/pickup`, {
    method: 'POST',
    body: JSON.stringify({ pickup_code: String(pickupCode || '').toUpperCase() }),
  });
  console.log('✅ Pedido retirado:', data);
  return data;
};

// Finalizar entrega (precisa do delivery_code do cliente)
export const completeDelivery = async (orderId, deliveryCode) => {
  console.log('🏁 Finalizando entrega:', orderId);
  const data = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ delivery_code: String(deliveryCode || '').toUpperCase() }),
  });
  console.log('✅ Entrega completada:', data);
  return data;
};

// Pedidos para avaliar (entregador)
export const getOrdersToReview = async (signal) => {
  const token = getAuthToken();
  if (!token) throw new Error('Token de autenticação não encontrado');

  const res = await fetch(`${API_URL}/api/orders/pending-delivery-review`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) throw new Error(`Erro HTTP! Status: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
};

// Detalhes do pedido
export const getOrderDetail = async (orderId) =>
  fetchWithAuth(`${API_URL}/api/orders/${orderId}`);

// Pedidos disponíveis para aceitar
export const getAvailableOrders = async () =>
  fetchWithAuth(`${API_URL}/api/orders/available`);
