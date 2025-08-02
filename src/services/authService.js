// Ficheiro: src/services/authService.js (VERSÃO CORRIGIDA E CONSOLIDADA)

// A URL base da sua API. Mantemos aqui pois é usada pela autenticação.
const API_BASE_URL = '/api';

// Chaves do localStorage para manter a consistência.
const AUTH_TOKEN_KEY = 'deliveryAuthToken';
const DELIVERY_USER_DATA_KEY = 'deliveryUser';

/**
 * Cria os cabeçalhos de autenticação para as chamadas à API.
 * Esta função será usada tanto pelo authService quanto pelo deliveryService.
 * @returns {object} - Objeto de cabeçalho com o token, se existir.
 */
export const createAuthHeaders = () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Processa a resposta da API, tratando erros de forma centralizada.
 * Esta função também será usada pelos dois serviços.
 * @param {Response} response - O objeto de resposta do fetch.
 * @returns {Promise<object|null>} - Os dados da resposta em JSON.
 */
export const processResponse = async (response) => {
    // Se não autorizado, limpa a sessão e redireciona para o login.
    if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(DELIVERY_USER_DATA_KEY);
        window.location.href = '/login';
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    // Trata outras respostas de erro.
    if (!response.ok) {
        try {
            const errorData = await response.json();
            const errorMessage = errorData.message || errorData.error || `Erro ${response.status}`;
            throw new Error(errorMessage);
        } catch (jsonError) {
            throw new Error(`Erro HTTP ${response.status}`);
        }
    }
    // Se a resposta for "No Content", retorna null.
    if (response.status === 204) {
        return null;
    }
    return response.json();
};


// --- SERVIÇO DE AUTENTICAÇÃO ---
// Um objeto que agrupa todas as funções de autenticação.
export const authService = {
    register: async (name, email, password, phone) => {
        const dataToSend = { email, password, name, user_type: 'delivery', profileData: { phone } };
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
        });
        return processResponse(response);
    },

    login: async (email, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, user_type: 'delivery' }),
        });
        const data = await processResponse(response);
        if (data.access_token) {
            localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
            // Salva os dados do utilizador retornados no login.
            // **IMPORTANTE:** O 'data.data.user' ou 'data.user' deve conter o 'id' do delivery_profile aqui.
            // Pelo que vi, 'data.data.user' é o mais provável de existir.
            localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(data.data.user || data.user));
        }
        return data;
    },

    logout: () => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(DELIVERY_USER_DATA_KEY);
        window.location.href = '/login';
    },

    isAuthenticated: () => !!localStorage.getItem(AUTH_TOKEN_KEY),

    getUser: () => {
        const user = localStorage.getItem(DELIVERY_USER_DATA_KEY);
        return user ? JSON.parse(user) : null;
    },
    
    forgotPassword: async (email) => {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        return processResponse(response);
    },

    resetPassword: async (token, newPassword) => {
        const response = await fetch(`${API_BASE_URL}/auth/update-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: token, password: newPassword }),
        });
        return processResponse(response);
    },

    /**
     * Retorna o ID do perfil do utilizador (entregador) logado.
     * Assume que o objeto de usuário salvo no localStorage (DELIVERY_USER_DATA_KEY)
     * tem uma propriedade 'id' que corresponde ao ID do delivery_profile.
     * @returns {string|null} - O ID do perfil ou null se não estiver logado.
     */
    getProfileId: () => {
        const user = authService.getUser(); // Reutiliza a função getUser existente
        // Com base nos seus schemas, o ID do perfil na tabela delivery_profiles é 'id'.
        // O objeto de usuário salvo no localStorage deve conter este 'id'.
        return user ? user.id : null; 
    },
};