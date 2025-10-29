// inksa-entregadores/src/services/orderService.js

const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

// ✅ Helper para pegar o token
const getAuthToken = () => {
  return localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token');
};

// ✅ Helper para fazer requisições (com erros mais claros)
// - Não força Content-Type em GET
// - Loga o corpo do erro quando existir
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error('Token de autenticação não encontrado');

  const method = (options.method || 'GET').toUpperCase();
  const baseHeaders = method === 'GET' ? {} : { 'Content-Type': 'application/json' };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail;
    try {
      detail = await response.json(); // tenta JSON ({"error": "...", ...})
    } catch {
      detail = await response.text(); // fallback texto
    }
    console.error('Erro na requisição:', {
      url,
      status: response.status,
      statusText: response.statusText,
      detail,
    });
    const msg =
      (detail && (detail.error || detail.message)) ||
      `Erro HTTP! Status: ${response.status}`;
    throw new Error(msg);
  }

  return response.json();
};

// ✅ Aceitar pedido usando endpoint /accept (POST)
export const acceptDelivery = async (orderId) => {
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}/accept`, { method: 'POST' });
};

// ✅ Retirar pedido (com código de retirada) — envia em MAIÚSCULAS
export const pickupOrder = async (orderId, pickupCode) => {
  const code = String(pickupCode || '').trim().toUpperCase();
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}/pickup`, {
    method: 'POST',
    body: JSON.stringify({ pickup_code: code }),
  });
};

// ✅ Completar entrega (com código de entrega) — envia em MAIÚSCULAS
export const completeDelivery = async (orderId, deliveryCode) => {
  const code = String(deliveryCode || '').trim().toUpperCase();
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ delivery_code: code }),
  });
};

// ✅ Buscar pedidos que o entregador ainda precisa avaliar
export const getOrdersToReview = async (signal) => {
  const token = getAuthToken();
  if (!token) throw new Error('Token de autenticação não encontrado');

  const response = await fetch(`${API_URL}/api/orders/pending-delivery-review`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// ✅ Obter detalhes do pedido
export const getOrderDetail = async (orderId) => {
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}`);
};

// ✅ Buscar pedidos disponíveis para aceitar
export const getAvailableOrders = async () => {
  return fetchWithAuth(`${API_URL}/api/orders/available`);
};

// ✅ NOVO: Buscar o CÓDIGO DE RETIRADA (apenas após aceitar)
// Segurança no backend garante que só o entregador atribuído ou restaurante/cliente veem
export const getPickupCode = async (orderId) => {
  return fetchWithAuth(`${API_URL}/api/orders/${orderId}/pickup-code`);
};
