// deliveryService.js - VERSÃO FINAL E CORRIGIDA

import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
const DELIVERY_USER_DATA_KEY = 'deliveryUser'; 
const DELIVERY_AUTH_TOKEN_KEY = 'deliveryAuthToken';

/**
 * Função auxiliar para processar a resposta da API.
 */
const processResponse = async (response ) => {
    console.log('Response status:', response.status, 'URL:', response.url);
    
    if (response.status === 401) {
        authService.logout();
        return null;
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
    }
    
    // Permite respostas vazias (status 204)
    if (response.status === 204) {
        return null;
    }
    
    return response.json();
};

/**
 * Função auxiliar para criar os cabeçalhos de autenticação.
 */
const createAuthHeaders = () => {
    const token = authService.getToken() || localStorage.getItem(DELIVERY_AUTH_TOKEN_KEY);
    
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
            const response = await fetch(`${API_BASE_URL}/api/delivery/profile`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            const data = await processResponse(response);
            return data.data || data;
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

    async getDashboardStats() { 
        try {
            // ✅ CORREÇÃO: A rota no backend não precisa do profile_id, pois ele é pego do token.
            const url = `${API_BASE_URL}/api/delivery/stats/dashboard-stats`;
            
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

    // ==============================================================================
    // ✅ FUNÇÃO ADICIONADA
    // ==============================================================================
    async getEarningsHistory(startDate, endDate) {
        try {
            console.log('Buscando histórico de ganhos...');
            
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            const queryString = params.toString();
            
            // A rota completa será /api/delivery/stats/earnings-history?start_date=...&end_date=...
            const url = `${API_BASE_URL}/api/delivery/stats/earnings-history${queryString ? `?${queryString}` : ''}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            
            const data = await processResponse(response);
            return data.data || {}; // Retorna o objeto de dados ou um objeto vazio
        } catch (error) {
            console.error('Erro ao buscar histórico de ganhos:', error);
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
            return data.data || [];
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
                body: JSON.stringify({}),
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
                body: JSON.stringify({}),
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
            
            const token = authService.getToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(`${API_BASE_URL}/api/delivery/upload-avatar`, {
                method: 'POST',
                headers: headers,
                body: formData,
            });
            
            const data = await processResponse(response);
            
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
