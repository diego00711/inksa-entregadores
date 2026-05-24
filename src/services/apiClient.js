// src/services/apiClient.js
// Wrapper global de fetch com interceptação de 401/403

const AUTH_TOKEN_KEY = 'deliveryAuthToken';
const USER_DATA_KEY = 'deliveryUser';
const REFRESH_TOKEN_KEY = 'deliveryRefreshToken';

/**
 * Substituto de fetch que dispara o evento `auth:unauthorized`
 * sempre que a API responder com 401 ou 403, limpa o localStorage
 * e devolve a response original para que o chamador possa tratar
 * sem quebrar o fluxo.
 */
const apiFetch = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    // Erros de rede (sem conexão, CORS abortado, etc.)
    window.dispatchEvent(new CustomEvent('network:error'));
    throw networkError;
  }

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  return response;
};

export default apiFetch;
