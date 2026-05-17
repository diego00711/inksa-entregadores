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
            response = await apiFetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
        } catch (networkError) {
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
        }

        const responseData = await processResponse(response);

        // ✅ Verifica diferentes formatos de resposta da API
        let token, user;
        
        // Formato 1: { status: 'success', data: { token, user } }
        if (responseData?.status === 'success' && responseData?.data?.token) {
            token = responseData.data.token;
            user = responseData.data.user;
        }
        // Formato 2: { status: 'success', token, user }
        else if (responseData?.status === 'success' && responseData?.token) {
            token = responseData.token;
            user = responseData.user;
        }
        // Formato 3: { token, user } (resposta direta)
        else if (responseData?.token) {
            token = responseData.token;
            user = responseData.user;
        }
        
        if (token) {
            if (user && user.user_type !== 'delivery') {
                throw new Error('Acesso negado. Este login é apenas para entregadores.');
            }
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
            return { token, user, success: true };
        }

        throw new Error('Token não recebido do servidor');
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
