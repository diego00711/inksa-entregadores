// src/services/authService.js - VERSÃO FINAL CORRIGIDA

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

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
        console.log('🔐 Iniciando login do entregador...', { email });
        
        // ✅ CORREÇÃO: Usa a rota genérica de login que já existe
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        console.log('📡 Response status:', response.status);
        const responseData = await processResponse(response);
        console.log('📥 Response data:', responseData);

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
            // ✅ Valida se é um entregador
            if (user.user_type !== 'delivery') {
                console.error('❌ Usuário não é um entregador:', user.user_type);
                throw new Error('Acesso negado. Este login é apenas para entregadores.');
            }
            
            // ✅ Salva o token e usuário
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
            
            console.log('✅ Token salvo com sucesso!');
            console.log('✅ Token:', token.substring(0, 20) + '...');
            console.log('✅ User:', user);
            
            return { token, user, success: true };
        }

        // Se não encontrou o token em nenhum formato
        console.error('❌ Token não encontrado na resposta:', responseData);
        throw new Error('Token não recebido do servidor');
    },

    async register(userData) {
        console.log('📝 Registrando novo entregador...');
        
        // ✅ CORREÇÃO: Usa a rota genérica de registro que já existe
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...userData,
                user_type: 'delivery' // ✅ Especifica que é entregador
            }),
        });
        
        const responseData = await processResponse(response);
        console.log('📥 Response data:', responseData);
        
        // Tenta salvar o token se vier na resposta do registro
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
            console.log('✅ Token salvo após registro!');
        }
        
        return responseData;
    },

    logout() {
        console.log('👋 Fazendo logout...');
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        console.log('✅ Dados removidos do localStorage');
        window.location.href = '/login';
    },

    getToken() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
            console.warn('⚠️ Token não encontrado no localStorage');
        }
        return token;
    },

    getCurrentUser() {
        const userStr = localStorage.getItem(USER_DATA_KEY);
        if (!userStr) {
            console.warn('⚠️ User não encontrado no localStorage');
            return null;
        }
        try {
            return JSON.parse(userStr);
        } catch (error) {
            console.error('❌ Erro ao parsear user:', error);
            return null;
        }
    },

    isAuthenticated() {
        const isAuth = !!localStorage.getItem(AUTH_TOKEN_KEY);
        console.log('🔐 Está autenticado?', isAuth);
        return isAuth;
    }
};

export default authService;
