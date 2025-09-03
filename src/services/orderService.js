// src/services/orderService.js (VERSÃO COMPLETA E CORRIGIDA)

import { DELIVERY_API_URL, createAuthHeaders, processResponse } from './api';

/**
 * Busca os pedidos entregues que o entregador precisa avaliar.
 */
export async function getOrdersToReview() {
  try {
    const response = await fetch(`${DELIVERY_API_URL}/api/orders/pending-delivery-review`, {
      headers: createAuthHeaders(),
    });
    return await processResponse(response);
  } catch (error) {
    console.error('Erro ao buscar pedidos para avaliação:', error);
    throw error;
  }
}

/**
 * Busca as entregas com base em um status.
 */
export async function getDeliveriesByStatus(status = 'all') {
  try {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders?status=${status}`, {
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar entregas por status:', error);
    throw error;
  }
}

/**
 * Busca os detalhes de um pedido específico.
 */
export async function getOrderDetail(orderId) {
  try {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/${orderId}`, {
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data || data;
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    throw error;
  }
}

/**
 * Aceita uma entrega.
 */
export async function acceptDelivery(orderId) {
  try {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/${orderId}/accept`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({}),
    });
    return await processResponse(response);
  } catch (error) {
    console.error('Erro ao aceitar entrega:', error);
    throw error;
  }
}

/**
 * Completa uma entrega.
 */
export async function completeDelivery(orderId) {
  try {
    const response = await fetch(`${DELIVERY_API_URL}/api/delivery/orders/${orderId}/complete`, {
      method: 'POST', 
      headers: createAuthHeaders(),
      body: JSON.stringify({}),
    });
    return await processResponse(response);
  } catch (error) {
    console.error('Erro ao completar entrega:', error);
    throw error;
  }
}
