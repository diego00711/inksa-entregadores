// src/services/reviewService.js

import { DELIVERY_API_URL, createAuthHeaders, processResponse } from './api';

/**
 * Busca as avaliações que o entregador logado recebeu.
 */
export async function getMyDeliveryReviews() {
  const response = await fetch(`${DELIVERY_API_URL}/api/review/delivery/my-reviews`, {
    headers: createAuthHeaders(),
  });
  return processResponse(response);
}

/**
 * Envia uma nova avaliação para um cliente.
 */
export async function postClientReview(reviewData) {
  const response = await fetch(`${DELIVERY_API_URL}/api/review/clients/${reviewData.clientId}/reviews`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify(reviewData),
  });
  return processResponse(response);
}
