// services/authService.js - INKSA ENTREGADORES (VERSÃO CORRIGIDA)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
const AUTH_TOKEN_KEY = 'deliveryAuthToken';
const DELIVERY_USER_DATA_KEY = 'deliveryUser';

// FUNÇÃO AUXILIAR EXPORTADA
export const processResponse = async (response) => {
    if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(DELIVERY_USER_DATA_KEY);
        window.location.href = '/login';
        return null;
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

// FUNÇÃO AUXILIAR EXPORTADA
export const createAuthHeaders = () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
};

export const authService = {
    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    password,
                    user_type: 'entregador' 
                }),
            });

            const data = await processResponse(response);
            
            if (data && data.token) {
                localStorage.setItem(AUTH_TOKEN_KEY, data.token);
                localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(data.user));
                return data;
            }
            
            throw new Error('Token não recebido');
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    },

    async register(deliveryData) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...deliveryData,
                    user_type: 'entregador'
                }),
            });

            const data = await processResponse(response);
            
            if (data && data.token) {
                localStorage.setItem(AUTH_TOKEN_KEY, data.token);
                localStorage.setItem(DELIVERY_USER_DATA_KEY, JSON.stringify(data.user));
                return data;
            }
            
            return data;
        } catch (error) {
            console.error('Erro no registro:', error);
            throw error;
        }
    },

    async logout() {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            if (token) {
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: createAuthHeaders(),
                });
            }
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(DELIVERY_USER_DATA_KEY);
            window.location.href = '/login';
        }
    },

    async forgotPassword(email) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao solicitar recuperação de senha:', error);
            throw error;
        }
    },

    async resetPassword(token, newPassword) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, new_password: newPassword }),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao resetar senha:', error);
            throw error;
        }
    },

    async updateLocation(latitude, longitude) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/location`, {
                method: 'PUT',
                headers: createAuthHeaders(),
                body: JSON.stringify({ latitude, longitude }),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao atualizar localização:', error);
            throw error;
        }
    },

    async setAvailability(isAvailable) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/availability`, {
                method: 'PUT',
                headers: createAuthHeaders(),
                body: JSON.stringify({ is_available: isAvailable }),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao alterar disponibilidade:', error);
            throw error;
        }
    },

    async getActiveDeliveries() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/active`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar entregas ativas:', error);
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

    async completeDelivery(deliveryId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/${deliveryId}/complete`, {
                method: 'POST',
                headers: createAuthHeaders(),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao completar entrega:', error);
            throw error;
        }
    },

    async getEarnings(period) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/earnings?period=${period}`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar ganhos:', error);
            throw error;
        }
    },

    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    getCurrentUser() {
        const deliveryStr = localStorage.getItem(DELIVERY_USER_DATA_KEY);
        return deliveryStr ? JSON.parse(deliveryStr) : null;
    },

    isAuthenticated() {
        return !!localStorage.getItem(AUTH_TOKEN_KEY);
    }
};

// EXPORTAÇÃO DEFAULT PARA COMPATIBILIDADE
export default authService;
