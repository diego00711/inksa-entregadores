// authService.js - VERSÃO CORRIGIDA E FINAL

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

const AUTH_TOKEN_KEY = 'deliveryAuthToken';
const USER_DATA_KEY = 'deliveryUser';
const REFRESH_TOKEN_KEY = 'deliveryRefreshToken';
const DEFAULT_USER_TYPE = 'entregador';

const processResponse = async (response ) => {
    if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        // Força o recarregamento da página para o estado de login.
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
    async login(email, password, userType = DEFAULT_USER_TYPE) {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, user_type: userType }),
        });

        const data = await processResponse(response);
        if (data && data.session && data.session.access_token) {
            localStorage.setItem(AUTH_TOKEN_KEY, data.session.access_token);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.session.refresh_token);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
            return { token: data.session.access_token, user: data.user, success: true };
        }
        throw new Error('Token não recebido do servidor');
    },

    async register(userData, userType = DEFAULT_USER_TYPE) {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userData, user_type: userType }),
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

// Exporta apenas como default para evitar erros de build.
export default authService;
