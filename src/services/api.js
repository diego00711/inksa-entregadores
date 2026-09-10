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
  
  // ⚠️ NÃO DESLOGA AQUI (corrigido em 09/09/2026).
  //
  // Esta função apagava o token e fazia window.location.href = '/login' no
  // primeiro 401 que visse. Três problemas:
  //
  //   1. NÃO TENTAVA RENOVAR. O apiClient troca o refresh_token por um token
  //      novo e repete a chamada; aqui um token vencido — coisa normal depois
  //      de uma hora — era tratado como sessão morta.
  //   2. window.location.href RECARREGA A PÁGINA INTEIRA, em vez do navigate()
  //      do React Router que o resto do app usa. O entregador via a tela
  //      piscar e voltar do zero.
  //   3. Apagava a sessão SEM apagar o refresh_token, deixando lixo no
  //      localStorage.
  //
  // Quem decide que a sessão acabou é o apiClient, que só desiste depois da
  // renovação falhar de verdade — e aí dispara 'auth:unauthorized', que o
  // App.jsx trata com toast + navigate. Aqui só devolvemos o erro.
  if (response.status === 401) {
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
