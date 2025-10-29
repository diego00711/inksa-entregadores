// inksa-entregadores/src/services/orderService.js

const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

// Helper – token
const getAuthToken = () =>
  localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token');

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
    console.error('Erro na requisição:', {
      url,
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Erro HTTP! Status: ${response.status}`);
  }

  // a API pode devolver {data: ...} ou direto o objeto/array
  return response.json();
};

// === Ações do entregador ===

// Aceitar pedido
export const acceptDelivery = async (orderId) => {
  console.log('🚀 Aceitando pedido:', orderId);
  const res = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/accept`, {
    method: 'POST',
  });
  console.log('✅ Pedido aceito:', res);
  return res;
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
  console.log('🏁 Completando entrega:', orderId);
  const res = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ delivery_code: deliveryCode }),
  });
  console.log('✅ Entrega completada:', res);
  return res;
};

// Pedidos a avaliar (entregador)
export const getOrdersToReview = async (signal) => {
  console.log('🔍 [Entregador] Buscando pedidos para avaliar...');
  const token = getAuthToken();
  if (!token) throw new Error('Token de autenticação não encontrado');

  const url = `${API_URL}/api/orders/pending-delivery-review`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);

  const data = await response.json();
  const orders = Array.isArray(data) ? data : [];
  console.log(`✅ [Entregador] ${orders.length} pedidos pendentes encontrados`);
  return orders;
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
