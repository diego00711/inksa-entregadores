// deliveryService.js - VERSÃO CORRIGIDA E FINAL

import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com/api';
const DELIVERY_USER_DATA_KEY = 'deliveryUser'; 

/**
 * Função auxiliar para processar a resposta da API.
 */
const processResponse = async (response ) => {
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
 */
const createAuthHeaders = () => {
    const token = authService.getToken();
    return {
        'Authorization': `Bearer ${token}`,
    };
};

const DeliveryService = {
    async getDeliveryProfile() {
        const response = await fetch(`${API_BASE_URL}/delivery/profile`, {
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        const data = await processResponse(response);
        return data.data; 
    },

    async updateDeliveryProfile(profileData) {
        const response = await fetch(`${API_BASE_URL}/delivery/profile`, {
            method: 'PUT',
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData),
        });
        const data = await processResponse(response);
        const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
        if (userStr && data.data) {
            const currentUserData = JSON.parse(userStr);
            const updatedUserData = { ...currentUserData, ...data.data }; 
            localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
        }
        return data.data;
    },

    async getDashboardStats(profileId) { 
        const response = await fetch(`${API_BASE_URL}/delivery/dashboard-stats/${profileId}`, { 
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        const data = await processResponse(response);
        return data.data; 
    },

    async getDeliveriesByStatus(status = 'all') {
        const response = await fetch(`${API_BASE_URL}/delivery/orders?status=${status}`, {
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        const data = await processResponse(response);
        return data.data || [];
    },

    async getOrderDetail(orderId) {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}`, {
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        const data = await processResponse(response);
        return data.data; 
    },

    async acceptDelivery(orderId) {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/accept`, {
            method: 'POST',
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        return processResponse(response);
    },

    async completeDelivery(orderId) {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/complete`, {
            method: 'POST', 
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        return processResponse(response);
    },

    async uploadDeliveryAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await fetch(`${API_BASE_URL}/delivery/upload-avatar`, {
            method: 'POST',
            headers: createAuthHeaders(), // FormData define o Content-Type automaticamente
            body: formData,
        });
        const data = await processResponse(response);
        const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
        if (userStr && data.avatar_url) {
            const currentUserData = JSON.parse(userStr);
            const updatedUserData = { ...currentUserData, avatar_url: data.avatar_url };
            localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
        }
        return data.avatar_url;
    },
};

export default DeliveryService;
