// src/services/authService.js - VERSÃO FINAL CORRIGIDA

import { DELIVERY_API_URL as API_BASE_URL } from './api';
import apiFetch from './apiClient';

const AUTH_TOKEN_KEY = 'deliveryAuthToken';
const USER_DATA_KEY = 'deliveryUser';
const REFRESH_TOKEN_KEY = 'deliveryRefreshToken';

const processResponse = async (response) => {
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
    async login(email, password) {
        let response;
        try {
            // NAO usa apiFetch/processResponse: no login, 401 e senha errada (nao sessao expirada)
            response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, expected_user_type: 'delivery' }),
            });
        } catch (networkError) {
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
        }

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(responseData.error || responseData.message || 'Não foi possível entrar. Tente novamente.');
        }

        let token, user;
        if (responseData?.data?.token) {
            token = responseData.data.token;
            user = responseData.data.user;
        } else if (responseData?.token) {
            token = responseData.token;
            user = responseData.user;
        }

        if (token) {
            if (user && user.user_type !== 'delivery') {
                throw new Error('Esta conta não é de Entregador. Use o app correto.');
            }
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
            return { token, user, success: true };
        }

        throw new Error('Não foi possível entrar. Tente novamente.');
    },

    async register(userData) {
        let response;
        try {
            response = await apiFetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...userData,
                    user_type: 'delivery'
                }),
            });
        } catch (networkError) {
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
        }
        
        const responseData = await processResponse(response);

        let token, user;
        
        if (responseData?.status === 'success' && responseData?.data?.token) {
            token = responseData.data.token;
            user = responseData.data.user;
        } else if (responseData?.status === 'success' && responseData?.token) {
            token = responseData.token;
            user = responseData.user;
        } else if (responseData?.token) {
            token = responseData.token;
            user = responseData.user;
        }
        
        if (token) {
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
        }
        return responseData;
    },

    async logout() {
        // Marca como indisponível antes de sair -- sem isso, quem estava
        // online continuava aparecendo disponível pra receber entregas
        // mesmo deslogado (e via isso ao logar de novo). Best-effort: se
        // falhar (sem rede, token já vencido etc.), sai mesmo assim.
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            if (token) {
                await fetch(`${API_BASE_URL}/api/delivery/profile`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ is_available: false }),
                });
            }
        } catch {
            // ignora -- nao bloqueia o logout
        }

        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/login';
    },

    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(USER_DATA_KEY));
        } catch {
            return null;
        }
    },

    isAuthenticated() {
        return !!localStorage.getItem(AUTH_TOKEN_KEY);
    }
};

export default authService;
