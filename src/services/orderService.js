// inksa-entregadores/src/services/orderService.js - VERSÃO COMPLETA

const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

// ✅ Helper para pegar o token
const getAuthToken = () => {
    return localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token');
};

// ✅ Helper para fazer requisições
const fetchWithAuth = async (url, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
        throw new Error('Token de autenticação não encontrado');
    }
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na requisição:', {
            url,
            status: response.status,
            statusText: response.statusText,
            error: errorText
        });
        throw new Error(`Erro HTTP! Status: ${response.status}`);
    }
    
    return response.json();
};

// ✅ Aceitar pedido usando endpoint /accept com POST
export const acceptDelivery = async (orderId) => {
    try {
        console.log('🚀 Aceitando pedido:', orderId);
        
        const response = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/accept`, {
            method: 'POST'
        });
        
        console.log('✅ Pedido aceito com sucesso:', response);
        return response;
    } catch (error) {
        console.error('❌ Erro ao aceitar pedido:', error);
        throw error;
    }
};

// ✅ Retirar pedido (com código de retirada)
export const pickupOrder = async (orderId, pickupCode) => {
    try {
        console.log('📦 Retirando pedido:', orderId);
        
        const response = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/pickup`, {
            method: 'POST',
            body: JSON.stringify({ pickup_code: pickupCode })
        });
        
        console.log('✅ Pedido retirado:', response);
        return response;
    } catch (error) {
        console.error('❌ Erro ao retirar pedido:', error);
        throw error;
    }
};

// ✅ Completar entrega (com código de entrega)
export const completeDelivery = async (orderId, deliveryCode) => {
    try {
        console.log('🏁 Completando entrega:', orderId);
        
        const response = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/complete`, {
            method: 'POST',
            body: JSON.stringify({ delivery_code: deliveryCode })
        });
        
        console.log('✅ Entrega completada:', response);
        return response;
    } catch (error) {
        console.error('❌ Erro ao completar entrega:', error);
        throw error;
    }
};

/**
 * ✅ NOVO: Buscar pedidos para avaliar (ENTREGADOR)
 * Pedidos que o entregador já entregou mas ainda não avaliou o cliente
 */
export const getOrdersToReview = async (signal) => {
    try {
        console.log('🔍 [Entregador] Buscando pedidos para avaliar...');
        
        const url = `${API_URL}/api/orders/pending-delivery-review`;
        
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('Token de autenticação não encontrado');
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            signal
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const orders = Array.isArray(data) ? data : [];
        
        console.log(`✅ [Entregador] ${orders.length} pedidos pendentes encontrados`);
        
        return orders;
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('❌ [Entregador] Erro ao buscar pedidos para avaliar:', error);
        }
        throw error;
    }
};

// ✅ Obter detalhes do pedido
export const getOrderDetail = async (orderId) => {
    try {
        return await fetchWithAuth(`${API_URL}/api/orders/${orderId}`);
    } catch (error) {
        console.error('Erro ao buscar detalhes do pedido:', error);
        throw error;
    }
};

// ✅ Buscar pedidos disponíveis para aceitar
export const getAvailableOrders = async () => {
    try {
        return await fetchWithAuth(`${API_URL}/api/orders/available`);
    } catch (error) {
        console.error('Erro ao buscar pedidos disponíveis:', error);
        throw error;
    }
};
