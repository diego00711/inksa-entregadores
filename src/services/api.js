// src/services/api.js (VERSÃO COMPLETA E CORRIGIDA)

// URL base da API para todos os serviços do entregador
export const DELIVERY_API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

/**
 * Processa a resposta da API, tratando erros comuns.
 */
export const processResponse = async (response) => {
  // Verifica se é um erro de CORS/conexão
  if (response.status === 0 || response.type === 'opaque') {
    throw new Error('Erro de conexão/CORS. Verifique se o servidor está online e configurado corretamente.');
  }
  
  if (response.status === 401) {
    console.error("Não autorizado. Fazendo logout...");
    localStorage.removeItem('deliveryAuthToken');
    localStorage.removeItem('deliveryUser');
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || `Erro HTTP! status: ${response.status}`);
    } catch (jsonError) {
      throw new Error(`Erro HTTP! status: ${response.status}`);
    }
  }
  
  if (response.status === 204) {
    return null;
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new Error('Erro ao processar resposta do servidor');
  }
};

/**
 * Cria os cabeçalhos de autenticação para as requisições.
 */
export const createAuthHeaders = () => {
  const token = localStorage.getItem('deliveryAuthToken');
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('Nenhum token de autenticação encontrado!');
  }
  
  return headers;
};
