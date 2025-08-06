// src/services/deliveryService.js (VERSÃO FINAL E CORRIGIDA para Gamificação)

import { createAuthHeaders, processResponse, authService } from './authService';

// Base URL da sua API Flask. CONFIRME SE ESTÁ CORRETO.
const API_BASE_URL = 'http://127.0.0.1:5000/api'; 
const DELIVERY_USER_DATA_KEY = 'deliveryUser'; 

const DeliveryService = {
    getDeliveryProfile: async () => {
        const response = await fetch(`${API_BASE_URL}/delivery/profile`, {
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data; 
    },

    updateDeliveryProfile: async (profileData) => {
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

    getDashboardStats: async (profileId) => { 
        if (!profileId) {
            throw new Error("ID do perfil do entregador não fornecido para buscar estatísticas.");
        }
        const response = await fetch(`${API_BASE_URL}/delivery/dashboard-stats/${profileId}`, { 
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data; 
    },

    getDeliveriesByStatus: async (status = 'all') => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders?status=${status}`, {
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data || [];
    },

    getOrderDetail: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}`, {
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data; 
    },

    acceptDelivery: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/accept`, {
            method: 'POST',
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        return processResponse(response);
    },

    getEarningsHistory: async (profileId, startDate, endDate) => {
        if (!profileId) {
            throw new Error("ID do perfil do entregador não fornecido para buscar histórico de ganhos.");
        }

        let url = `${API_BASE_URL}/delivery/earnings-history`;
        const params = new URLSearchParams();
        if (startDate) {
            params.append('start_date', startDate);
        }
        if (endDate) {
            params.append('end_date', endDate);
        }
        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data; 
    },

    updateAvailability: async (profileId, isAvailable) => { 
        if (!profileId) {
            throw new Error("ID do perfil do entregador não fornecido para atualizar disponibilidade.");
        }
        const response = await fetch(`${API_BASE_URL}/delivery/profile`, { 
            method: 'PUT',
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_available: isAvailable }), 
        });
        const data = await processResponse(response);
        const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
        if (userStr && data.data) {
            const currentUserData = JSON.parse(userStr);
            const updatedUserData = { ...currentUserData, is_available: data.data.is_available };
            localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
        }
        return data.data; 
    },

    completeDelivery: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/complete`, {
            method: 'POST', 
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        return processResponse(response);
    },

    // ✅ NOVO: Função para buscar dados de gamificação
    getGamificationStats: async (profileId) => {
        if (!profileId) {
            throw new Error("ID do perfil do entregador não fornecido para buscar estatísticas de gamificação.");
        }
        const response = await fetch(`${API_BASE_URL}/gamification/${profileId}/points-level`, {
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data;
    },
    
    // ✅ NOVO: Função para buscar os badges do usuário
    getUserBadges: async (profileId) => {
        if (!profileId) {
            throw new Error("ID do perfil do entregador não fornecido para buscar badges.");
        }
        const response = await fetch(`${API_BASE_URL}/gamification/${profileId}/badges`, {
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data;
    },

    // ✅ NOVO: Função para buscar o ranking global
    getGlobalRankings: async (typeFilter = '') => { // typeFilter pode ser 'delivery', 'client', 'restaurant'
        let url = `${API_BASE_URL}/gamification/rankings`;
        if (typeFilter) {
            url += `?type=${typeFilter}`;
        }
        const response = await fetch(url, {
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data;
    },

    uploadDeliveryAvatar: async (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await fetch(`${API_BASE_URL}/delivery/upload-avatar`, {
            method: 'POST',
            headers: createAuthHeaders(),
            body: formData,
        });
        const data = await processResponse(response);
        const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
        if (userStr && data.avatar_url) { // data.avatar_url deve vir do backend
            const currentUserData = JSON.parse(userStr);
            const updatedUserData = { ...currentUserData, avatar_url: data.avatar_url };
            localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
        }
        return data.avatar_url; // Retorna a URL pública do avatar
    },
};

export default DeliveryService;