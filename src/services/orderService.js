// inksa-entregadores/src/services/orderService.js

import { DELIVERY_API_URL as API_URL } from './api';
import apiFetch from './apiClient';

const getAuthToken = () => localStorage.getItem('deliveryAuthToken');

// Helper – fetch autenticado
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error('Token de autenticação não encontrado');

  const response = await apiFetch(url, {
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

// Reportar ocorrência (não consegui entregar): cliente não localizado, endereço errado, etc.
// outcome (o que fazer com o pedido): return_to_restaurant | dispose | keep
export const reportIncident = async (orderId, { reason, notes, contactAttempts, outcome, photoUrl } = {}) => {
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}/report-incident`, {
    method: 'POST',
    body: JSON.stringify({
      reason,
      notes: notes || '',
      contact_attempts: contactAttempts || {},
      outcome: outcome || '',
      photo_url: photoUrl || '',
    }),
  });
};

// Envia a foto-comprovante da ocorrência (multipart) e retorna a URL pública
export const uploadIncidentPhoto = async (orderId, file) => {
  const token = getAuthToken();
  if (!token) throw new Error('Token de autenticação não encontrado');
  const form = new FormData();
  form.append('file', file);
  const response = await apiFetch(`${API_URL}/api/orders/${orderId}/incident-photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // sem Content-Type: o browser define o boundary
    body: form,
  });
  if (!response.ok) {
    const t = await response.text().catch(() => '');
    let msg = `Erro ${response.status}`;
    try { msg = JSON.parse(t)?.error || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  const data = await response.json();
  return data.photo_url || data?.data?.photo_url || null;
};

// Entregador confirma que devolveu o pedido ao restaurante
export const confirmReturn = async (orderId) => {
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}/confirm-return`, { method: 'POST' });
};

export const getOrdersToReview = async (signal) => {
  const token = getAuthToken();
  if (!token) throw new Error('Token de autenticação não encontrado');
  const response = await apiFetch(`${API_URL}/api/orders/pending-delivery-review`, {
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
