// src/services/orderService.js - VERSÃO FINAL E CORRIGIDA

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

// ✅ CORREÇÃO CRÍTICA: Aceitar pedido usando endpoint /accept com POST
export const acceptDelivery = async (orderId) => {
    try {
        console.log('🚀 Aceitando pedido:', orderId);
        
        // ✅ MUDANÇA: Endpoint correto /accept com POST
        const response = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/accept`, {
            method: 'POST'  // ✅ POST, não PUT!
        });
        
        console.log('✅ Pedido aceito com sucesso:', response);
        return response;
    } catch (error) {
        console.error('❌ Erro ao aceitar pedido:', error);
        throw error;
    }
};

// ✅ Completar entrega
export const completeDelivery = async (orderId) => {
    try {
        console.log('🏁 Completando entrega:', orderId);
        
        const response = await fetchWithAuth(`${API_URL}/api/orders/${orderId}/complete`, {
            method: 'POST',
            body: JSON.stringify({
                delivery_code: prompt('Digite o código de entrega:')
            })
        });
        
        console.log('✅ Entrega completada:', response);
        return response;
    } catch (error) {
        console.error('❌ Erro ao completar entrega:', error);
        throw error;
    }
};

// ✅ Buscar pedidos para avaliar (entregador)
export const getOrdersToReview = async () => {
    try {
        return await fetchWithAuth(`${API_URL}/api/orders/pending-delivery-review`);
    } catch (error) {
        console.error('Erro ao buscar pedidos para avaliar:', error);
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
