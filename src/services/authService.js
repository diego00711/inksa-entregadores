// src/services/deliveryService.js (VERSÃO COMPLETA E CORRIGIDA)

// Importa o authService como o módulo padrão para obter o token.
import authService from './authService';

// A URL base da API deve vir das variáveis de ambiente.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

/**
 * Função auxiliar para processar a resposta da API.
 * Lida com erros comuns e redireciona para o login se o token for inválido.
 */
const processResponse = async (response ) => {
    if (response.status === 401) {
        authService.logout();
        return null;
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido no servidor' }));
        throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

/**
 * Função auxiliar para criar os cabeçalhos de autenticação.
 */
const createAuthHeaders = () => {
    const token = authService.getToken();
    if (!token) {
        console.warn("Nenhum token de autenticação encontrado para a requisição.");
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

// Objeto que contém todos os métodos do serviço de entrega.
const deliveryService = {

    async getDeliveryStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/status`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar status do entregador:', error);
            throw error;
        }
    },

    async updateLocation(locationData) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/location`, {
                method: 'POST',
                headers: createAuthHeaders(),
                body: JSON.stringify(locationData),
            });
            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao atualizar localização:', error);
            throw error;
        }
    },

    async getAvailableDeliveries() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/deliveries/available`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar entregas disponíveis:', error);
            throw error;
        }
    },

    async acceptDelivery(deliveryId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/${deliveryId}/accept`, {
                method: 'POST',
                headers: createAuthHeaders(),
            });
            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao aceitar entrega:', error);
            throw error;
        }
    },
};

export default deliveryService;
