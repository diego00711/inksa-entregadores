// src/services/api.js

// URL base da API para todos os serviços do entregador
export const DELIVERY_API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

/**
 * Processa a resposta da API, tratando erros comuns.
 */
export const processResponse = async (response ) => {
  if (response.status === 401) {
    // Idealmente, chame uma função de logout centralizada aqui
    console.error("Não autorizado. Fazendo logout...");
    // authService.logout(); 
    window.location.href = '/login'; // Redireciona para o login
    return null;
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
};

/**
 * Cria os cabeçalhos de autenticação para as requisições.
 */
export const createAuthHeaders = () => {
  // ✅ CORREÇÃO: Usa a chave correta do seu localStorage
  const token = localStorage.getItem('deliveryAuthToken');
  
  if (!token) {
    console.warn('Nenhum token de autenticação encontrado!');
    return { 'Content-Type': 'application/json' };
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};
