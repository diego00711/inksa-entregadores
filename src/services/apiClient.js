// src/services/apiClient.js
// Wrapper global de fetch com:
//  1. Renovação automática da sessão (refresh_token) ANTES do token vencer
//  2. Retry único em 401 (renova e repete a chamada)
//  3. Logout SÓ quando a sessão é definitivamente inválida
//
// Antes daqui o token só era *detectado* como expirado e o entregador caía no
// login (~1h de sessão) — o Gabriel reclamou de deslogar sozinho no meio do
// turno. Agora a sessão dura enquanto o refresh_token valer.

import { DELIVERY_API_URL } from './api';

const AUTH_TOKEN_KEY = 'deliveryAuthToken';
const USER_DATA_KEY = 'deliveryUser';
const REFRESH_TOKEN_KEY = 'deliveryRefreshToken';

// Retorno especial: falha de REDE na renovação. NÃO invalida a sessão — quem
// chamou deve só tentar de novo depois (backend hibernando/wifi caiu).
export const REFRESH_NETWORK_ERROR = 'REFRESH_NETWORK_ERROR';

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    return JSON.parse(atob(b64 + pad));
  } catch {
    return null;
  }
}

// margem generosa: renova 60s antes de vencer, pra nunca mandar token morto
export function isTokenExpired(token, marginSeconds = 60) {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return Math.floor(Date.now() / 1000) >= payload.exp - marginSeconds;
}

function expireSessionLocally() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

// Uma única renovação em voo: se várias telas pedirem ao mesmo tempo, só 1 request
let refreshPromise = null;

/**
 * Troca o refresh_token por um access_token novo (POST /api/auth/refresh).
 * @returns {Promise<string|null|'REFRESH_NETWORK_ERROR'>}
 *   token novo | null (sessão inválida -> deslogar) | REFRESH_NETWORK_ERROR
 */
export async function refreshSession() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const r = await fetch(`${DELIVERY_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!r.ok) return null; // 401: refresh_token revogado/inválido
      const json = await r.json();
      const token = json?.data?.token;
      const newRefresh = json?.data?.refresh_token;
      if (!token) return null;
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      if (newRefresh) localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
      return token;
    } catch {
      // backend hibernando / wifi caiu: NÃO desloga
      return REFRESH_NETWORK_ERROR;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function withAuthHeader(init, token) {
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

function makeResponse(status, message) {
  return new Response(JSON.stringify({ status: 'error', error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const apiFetch = async (input, init = {}) => {
  let token = localStorage.getItem(AUTH_TOKEN_KEY);

  // 1) Token vencendo? renova ANTES de chamar (em vez de deslogar).
  if (token && isTokenExpired(token)) {
    const renewed = await refreshSession();
    if (renewed === REFRESH_NETWORK_ERROR) {
      // rede fora: 503 (não 401) mantém a sessão viva pra próxima tentativa
      return makeResponse(503, 'Sem conexão. Tentando novamente...');
    }
    if (!renewed) {
      expireSessionLocally();
      return makeResponse(401, 'Sessão expirada');
    }
    token = renewed;
  }

  const doFetch = (tk) => fetch(input, tk ? withAuthHeader(init, tk) : init);

  let response;
  try {
    response = await doFetch(token);
  } catch (networkError) {
    window.dispatchEvent(new CustomEvent('network:error'));
    throw networkError;
  }

  // 2) 401 mesmo com token fresco? renova e tenta 1x.
  if (response.status === 401) {
    const renewed = await refreshSession();
    if (renewed === REFRESH_NETWORK_ERROR) return response;
    if (renewed) {
      try {
        response = await doFetch(renewed);
      } catch (networkError) {
        window.dispatchEvent(new CustomEvent('network:error'));
        throw networkError;
      }
      if (response.status !== 401) return response;
    }
    // renovação falhou de vez -> sessão inválida
    expireSessionLocally();
  }

  return response;
};

export default apiFetch;
