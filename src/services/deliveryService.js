// deliveryService.js - VERSÃO CORRIGIDA E FINAL

import authService from './authService';

// CORREÇÃO 1: Remover /api do final pois já está nas rotas
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
const DELIVERY_USER_DATA_KEY = 'deliveryUser'; 
const DELIVERY_AUTH_TOKEN_KEY = 'deliveryAuthToken'; // Adicionar constante do token

/**
 * Função auxiliar para processar a resposta da API.
 */
const processResponse = async (response) => {
    console.log('Response status:', response.status, 'URL:', response.url);
    
    if (response.status === 401) {
        authService.logout();
        return null;
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

/**
 * Função auxiliar para criar os cabeçalhos de autenticação.
 * CORREÇÃO 2: Garantir que o token seja lido corretamente
 */
const createAuthHeaders = () => {
    // Tentar pegar o token de várias formas possíveis
    const token = authService.getToken() || 
                  localStorage.getItem(DELIVERY_AUTH_TOKEN_KEY) ||
                  localStorage.getItem('authToken') ||
                  localStorage.getItem('deliveryAuthToken');
    
    console.log('Token presente:', !!token);
    
    if (!token) {
        console.warn('Nenhum token de autenticação encontrado!');
        return {
            'Content-Type': 'application/json',
        };
    }
    
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

const DeliveryService = {
    async getDeliveryProfile() {
        try {
            console.log('Buscando perfil do entregador...');
            // CORREÇÃO 3: URL completa com /api
            const response = await fetch(`${API_BASE_URL}/api/delivery/profile`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            const data = await processResponse(response);
            return data.data || data; // Flexível para diferentes formatos de resposta
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            throw error;
        }
    },

    async updateDeliveryProfile(profileData) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/profile`, {
                method: 'PUT',
                headers: createAuthHeaders(),
                body: JSON.stringify(profileData),
            });
            const data = await processResponse(response);
            
            // Atualizar localStorage se necessário
            const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
            if (userStr && data.data) {
                const currentUserData = JSON.parse(userStr);
                const updatedUserData = { ...currentUserData, ...data.data }; 
                localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
            }
            
            return data.data || data;
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    },

    async getDashboardStats(profileId) { 
        try {
            const url = profileId 
                ? `${API_BASE_URL}/api/delivery/dashboard-stats/${profileId}`
                : `${API_BASE_URL}/api/delivery/dashboard-stats`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            const data = await processResponse(response);
            return data.data || data;
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            throw error;
        }
    },

    async getDeliveriesByStatus(status = 'all') {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/orders?status=${status}`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            const data = await processResponse(response);
            return data.data || data || [];
        } catch (error) {
            console.error('Erro ao buscar entregas:', error);
            throw error;
        }
    },

    async getOrderDetail(orderId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/orders/${orderId}`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            const data = await processResponse(response);
            return data.data || data;
        } catch (error) {
            console.error('Erro ao buscar detalhes do pedido:', error);
            throw error;
        }
    },

    async acceptDelivery(orderId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/orders/${orderId}/accept`, {
                method: 'POST',
                headers: createAuthHeaders(),
                body: JSON.stringify({}), // Enviar body vazio se necessário
            });
            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao aceitar entrega:', error);
            throw error;
        }
    },

    async completeDelivery(orderId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/orders/${orderId}/complete`, {
                method: 'POST', 
                headers: createAuthHeaders(),
                body: JSON.stringify({}), // Enviar body vazio se necessário
            });
            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao completar entrega:', error);
            throw error;
        }
    },

    async uploadDeliveryAvatar(file) {
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            
            // Para FormData, não incluir Content-Type (browser define automaticamente)
            const token = authService.getToken() || 
                          localStorage.getItem(DELIVERY_AUTH_TOKEN_KEY) ||
                          localStorage.getItem('authToken') ||
                          localStorage.getItem('deliveryAuthToken');
            
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(`${API_BASE_URL}/api/delivery/upload-avatar`, {
                method: 'POST',
                headers: headers,
                body: formData,
            });
            
            const data = await processResponse(response);
            
            // Atualizar localStorage com nova URL do avatar
            const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
            if (userStr && data.avatar_url) {
                const currentUserData = JSON.parse(userStr);
                const updatedUserData = { ...currentUserData, avatar_url: data.avatar_url };
                localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
            }
            
            return data.avatar_url || data;
        } catch (error) {
            console.error('Erro ao fazer upload do avatar:', error);
            throw error;
        }
    },
};

export default DeliveryService;
