// src/services/deliveryService.js
import { createAuthHeaders, processResponse } from './authService';

const API_BASE_URL = 'http://127.0.0.1:5000/api';
const DELIVERY_USER_DATA_KEY = 'deliveryUser';

const DeliveryService = {
    getDeliveryProfile: async () => {
        const response = await fetch(`${API_BASE_URL}/delivery/profile`, {
            headers: createAuthHeaders(),
        });
        return processResponse(response);
    },

    updateDeliveryProfile: async (profileData) => {
        const response = await fetch(`${API_BASE_URL}/delivery/profile`, {
            method: 'PUT',
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData),
        });
        return processResponse(response);
    },

    getDashboardStats: async () => {
        const response = await fetch(`${API_BASE_URL}/delivery/dashboard-stats`, {
            headers: createAuthHeaders(),
        });
        return processResponse(response);
    },

    getDeliveriesByStatus: async (status = 'all') => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders?status=${status}`, {
            headers: createAuthHeaders(),
        });
        return processResponse(response);
    },

    getOrderDetail: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}`, {
            headers: createAuthHeaders(),
        });
        return processResponse(response);
    },

    acceptDelivery: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/accept`, {
            method: 'POST',
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        return processResponse(response);
    },

    updateAvailability: async (isAvailable) => {
        const response = await fetch(`${API_BASE_URL}/delivery/profile/availability`, {
            method: 'PUT',
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_available: isAvailable }),
        });
        return processResponse(response);
    },

    completeDelivery: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/complete`, {
            method: 'POST',
            headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        });
        return processResponse(response);
    }
};

export default DeliveryService;