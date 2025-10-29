// inksa-entregadores/src/services/orderService.js - VERSÃO COM VALIDAÇÃO DO TOKEN + NO-CACHE

const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

// Lê token salvo (prioriza o do entregador)
const getAuthToken = () =>
  localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token');

// Decodifica JWT (sem verificar assinatura) só para inspecionar user_type
const decodeJwt = (jwt) => {
  try {
    const [, payload] = jwt.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
};

// Garante que o token é de ENTREGADOR
const assertDeliveryToken = () => {
  const token = getAuthToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  const payload = decodeJwt(token);
  if (payload?.user_type !== 'delivery') {
    // Evita confusão de usar token do restaurante/cliente no app do entregador
    throw new Error('Sessão inválida: este login não é de ENTREGADOR.');
  }
  return token;
};

// Fetch com auth + no-cache e tratamento de 401/403
const fetchWithAuth = async (url, options = {}) => {
  const token = assertDeliveryToken();

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',          // evita SW/Cache
    credentials: 'omit',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      Expires: '0',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('Não autorizado. Faça login novamente.');
    }
    if (response.status === 403) {
      throw new Error('Acesso negado. Confirme que está logado como ENTREGADOR.');
    }
    throw new Error(`Erro ${response.status}: ${text || response.statusText}`);
  }

  // tenta JSON, se não der, retorna texto
  try {
    return await response.json();
  } catch {
    return {};
  }
};

// ----- AÇÕES DO ENTREGADOR -----

export const acceptDelivery = async (orderId) => {
  console.log('🚀 Aceitando pedido:', orderId);
  const url = `${API_URL}/api/orders/${orderId}/accept?t=${Date.now()}`;
  return await fetchWithAuth(url, { method: 'POST', body: JSON.stringify({}) });
};

export const pickupOrder = async (orderId, pickupCode) => {
  console.log('📦 Confirmando RETIRADA:', orderId);
  const url = `${API_URL}/api/orders/${orderId}/pickup?t=${Date.now()}`;
  return await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify({ pickup_code: String(pickupCode || '').trim().toUpperCase() }),
  });
};

export const completeDelivery = async (orderId, deliveryCode) => {
  console.log('🏁 Marcando ENTREGUE:', orderId);
  const url = `${API_URL}/api/orders/${orderId}/complete?t=${Date.now()}`;
  return await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify({ delivery_code: String(deliveryCode || '').trim().toUpperCase() }),
  });
};

// Info auxiliar
export const getOrderDetail = async (orderId) =>
  await fetchWithAuth(`${API_URL}/api/orders/${orderId}?t=${Date.now()}`);

export const getAvailableOrders = async () =>
  await fetchWithAuth(`${API_URL}/api/orders/available?t=${Date.now()}`);
