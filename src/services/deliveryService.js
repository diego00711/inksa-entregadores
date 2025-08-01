// Ficheiro: src/services/deliveryService.js (VERSÃO REFATORADA)

// Importamos as funções de ajuda do nosso novo authService.
import { createAuthHeaders, processResponse } from './authService.js';

// A URL base da API para as rotas de entrega.
const API_BASE_URL = '/api';
const DELIVERY_USER_DATA_KEY = 'deliveryUser'; // Precisamos da chave para atualizar os dados do user

// --- SERVIÇO DE ENTREGAS ---
// Um objeto que agrupa apenas as funções relacionadas a entregas.
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
        // Atualiza os dados do utilizador no localStorage após a edição do perfil.
        const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
        if (userStr && data.data) {
            const currentUserData = JSON.parse(userStr);
            const updatedUserData = { ...currentUserData, ...data.data };
            localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
        }
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
        // Atualiza o avatar no localStorage
        const userStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
        if (userStr && data.avatar_url) {
            const currentUserData = JSON.parse(userStr);
            const updatedUserData = { ...currentUserData, avatar_url: data.avatar_url };
            localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(updatedUserData));
        }
        return data.avatar_url;
    },

    getDeliveriesByStatus: async (status = 'all') => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders?status=${status}`, {
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data || [];
    },

    getDashboardStats: async () => {
        const response = await fetch(`${API_BASE_URL}/delivery/dashboard-stats`, {
            headers: createAuthHeaders(),
        });
        const data = await processResponse(response);
        return data.data;
    },

    getEarningsHistory: async () => {
        const response = await fetch(`${API_BASE_URL}/delivery/earnings-history`, {
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
        return data.data; // Retorna apenas o objeto do pedido
    },

    acceptDelivery: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/accept`, {
            method: 'POST',
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        return processResponse(response);
    },
};

export default DeliveryService;