// inksa-entregadores/src/services/orderService.js

import { DELIVERY_API_URL as API_URL } from './api';

const getAuthToken = () => localStorage.getItem('deliveryAuthToken');

// Helper – fetch autenticado
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
    let msg = `Erro ${response.status}`;
    try { msg = JSON.parse(errorText)?.error || JSON.parse(errorText)?.message || msg; } catch { /* noop */ }
    throw new Error(msg);
  }

  // a API pode devolver {data: ...} ou direto o objeto/array
  return response.json();
};

// === Ações do entregador ===

export const acceptDelivery = async (orderId) => {
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}/accept`, { method: 'POST' });
};

// Retirar pedido (com código de retirada)
export const pickupOrder = async (orderId, pickupCode) => {
  console.log('📦 Retirando pedido:', orderId);
  const res = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/pickup`, {
    method: 'POST',
    body: JSON.stringify({ pickup_code: pickupCode }),
  });
  console.log('✅ Pedido retirado:', res);
  return res;
};

// Completar entrega (com código de entrega)
export const completeDelivery = async (orderId, deliveryCode) => {
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ delivery_code: deliveryCode }),
  });
};

export const getOrdersToReview = async (signal) => {
  const token = getAuthToken();
  if (!token) throw new Error('Token de autenticação não encontrado');
  const response = await fetch(`${API_URL}/api/orders/pending-delivery-review`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`Erro ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// Detalhe do pedido
export const getOrderDetail = async (orderId) => {
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}`);
};

// Pedidos disponíveis para aceitar
export const getAvailableOrders = async () => {
  return fetchWithAuth(`${API_URL}/api/orders/available`);
};

/* === NOVO ===
 * Obter somente o pickup_code de um pedido
 * (útil para componentes que querem exibir o código sem carregar tudo)
 */
export const getPickupCode = async (orderId) => {
  const data = await fetchWithAuth(`${API_URL}/api/orders/${orderId}`);
  // aceita tanto {pickup_code: 'XXXX'} quanto {data: {pickup_code: 'XXXX'}}
  return (data && (data.pickup_code || data?.data?.pickup_code)) || null;
};
