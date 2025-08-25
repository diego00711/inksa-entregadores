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
    // Se o token for inválido ou expirado, a API retorna 401.
    if (response.status === 401) {
        // O authService já tem a lógica para limpar o storage e redirecionar.
        authService.logout();
        // Retorna null para interromper o fluxo.
        return null;
    }
    
    // Se a resposta não for bem-sucedida (ex: erro 400, 500).
    if (!response.ok) {
        // Tenta extrair a mensagem de erro do corpo da resposta.
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido no servidor' }));
        // Lança um erro para ser capturado pelo bloco catch da chamada.
        throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
    }
    
    // Se tudo correu bem, retorna os dados da resposta em formato JSON.
    return response.json();
};

/**
 * Função auxiliar para criar os cabeçalhos de autenticação.
 * Pega o token do authService e o adiciona ao cabeçalho 'Authorization'.
 */
const createAuthHeaders = () => {
    const token = authService.getToken();
    if (!token) {
        // Avisa no console se o token não for encontrado.
        console.warn("Nenhum token de autenticação encontrado para a requisição.");
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

// Objeto que contém todos os métodos do serviço de entrega.
const deliveryService = {

    /**
     * Busca o status atual do entregador.
     */
    async getDeliveryStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/status`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar status do entregador:', error);
            throw error; // Re-lança o erro para o componente que chamou a função.
        }
    },

    /**
     * Atualiza a localização do entregador.
     * @param {object} locationData - Objeto com latitude e longitude.
     */
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

    /**
     * Busca a lista de entregas disponíveis para o entregador.
     */
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

    /**
     * Aceita uma entrega específica.
     * @param {string} deliveryId - O ID da entrega a ser aceita.
     */
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
    
    // Adicione aqui outras funções do seu serviço de entrega conforme necessário.
};

// Exporta o objeto deliveryService como padrão.
export default deliveryService;
