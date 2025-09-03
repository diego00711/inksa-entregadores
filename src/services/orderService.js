// src/services/orderService.js (VERSÃO CORRIGIDA E COMPLETA)

import { DELIVERY_API_URL, createAuthHeaders, processResponse } from './api';

/**
 * Busca os pedidos entregues que o entregador precisa avaliar.
 */
export async function getOrdersToReview() {
  const response = await fetch(`${DELIVERY_API_URL}/api/orders/pending-delivery-review`, {
    headers: createAuthHeaders(),
  });
  return processResponse(response);
}

// ✅✅✅ FUNÇÃO ADICIONADA ✅✅✅
/**
 * Busca as entregas com base em um status.
 */
export async function getDeliveriesByStatus(status = 'all') {
  const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders?status=${status}`, {
    headers: createAuthHeaders(),
  });
  const data = await processResponse(response);
  return data.data || [];
}

/**
 * Busca os detalhes de um pedido específico.
 */
export async function getOrderDetail(orderId) {
  const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/${orderId}`, {
    headers: createAuthHeaders(),
  });
  const data = await processResponse(response);
  return data.data || data;
}

/**
 * Aceita uma entrega.
 */
export async function acceptDelivery(orderId) {
  const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/${orderId}/accept`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({}),
  });
  return processResponse(response);
}

/**
 * Completa uma entrega.
 */
export async function completeDelivery(orderId) {
  const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/${orderId}/complete`, {
    method: 'POST', 
    headers: createAuthHeaders(),
    body: JSON.stringify({}),
  });
  return processResponse(response);
}
