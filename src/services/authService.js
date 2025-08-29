// src/services/authService.js - VERSÃO FINAL E CORRIGIDA

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

const AUTH_TOKEN_KEY = 'deliveryAuthToken';
const USER_DATA_KEY = 'deliveryUser';
const REFRESH_TOKEN_KEY = 'deliveryRefreshToken'; // Mantido por consistência, embora não usado diretamente no login
const DEFAULT_USER_TYPE = 'delivery'; // ✅ Corrigido para 'delivery' para corresponder ao backend

const processResponse = async (response ) => {
    if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/login';
        return null;
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

const authService = {
    async login(email, password) { // ✅ Simplificado: userType é fixo
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // ✅ Envia o tipo de usuário correto para a API
            body: JSON.stringify({ email, password, user_type: DEFAULT_USER_TYPE }),
        });

        const responseData = await processResponse(response);

        // ✅ CORREÇÃO PRINCIPAL: Agora ele lê a resposta correta da nossa API
        // Procura por { status: 'success', data: { token: '...' } }
        if (responseData && responseData.status === 'success' && responseData.data && responseData.data.token) {
            const { token, user } = responseData.data;
            
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
            
            // O refresh token não vem da nossa API customizada, então não o salvamos.
            // localStorage.setItem(REFRESH_TOKEN_KEY, ...);

            return { token, user, success: true };
        }

        // Se o formato da resposta for inesperado, lança o erro.
        throw new Error('Token não recebido do servidor');
    },

    async register(userData) {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userData, user_type: DEFAULT_USER_TYPE }),
        });
        return await processResponse(response);
    },

    logout() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/login';
    },

    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    getCurrentUser() {
        const userStr = localStorage.getItem(USER_DATA_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated() {
        return !!localStorage.getItem(AUTH_TOKEN_KEY);
    }
};

export default authService;
