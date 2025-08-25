// authService.js - VERSÃO FINAL PARA TODOS OS APPS
// Funciona com a estrutura real da API: session.access_token

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

const AUTH_TOKEN_KEY = 'deliveryAuthToken';
const USER_DATA_KEY = 'deliveryUser';
const REFRESH_TOKEN_KEY = 'deliveryRefreshToken';
const DEFAULT_USER_TYPE = 'entregador'; 
const processResponse = async (response ) => {
    if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/login';
        return null;
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

const authService = {
    async login(email, password, userType = DEFAULT_USER_TYPE) {
        try {
            console.log('Tentando login com:', { email, user_type: userType });
            
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    password,
                    user_type: userType 
                }),
            });

            const data = await processResponse(response);
            console.log('Resposta do servidor:', data);
            
            if (data && data.session && data.session.access_token) {
                const token = data.session.access_token;
                const refreshToken = data.session.refresh_token;
                const user = data.user;
                
                localStorage.setItem(AUTH_TOKEN_KEY, token);
                localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
                localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
                
                console.log('Login bem-sucedido! Token salvo.');
                
                return {
                    token: token,
                    user: user,
                    success: true,
                    message: data.message
                };
            }
            
            throw new Error('Token não recebido do servidor');
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    },

    async register(userData, userType = DEFAULT_USER_TYPE) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...userData,
                    user_type: userType
                }),
            });

            const data = await processResponse(response);
            
            if (data && data.session && data.session.access_token) {
                const token = data.session.access_token;
                const refreshToken = data.session.refresh_token;
                const user = data.user;
                
                localStorage.setItem(AUTH_TOKEN_KEY, token);
                localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
                localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
                
                return {
                    token: token,
                    user: user,
                    success: true,
                    message: data.message
                };
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
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(USER_DATA_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            window.location.href = '/login';
        }
    },

    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    refresh_token: refreshToken
                }),
            });

            const data = await processResponse(response);
            
            if (data && data.session && data.session.access_token) {
                const token = data.session.access_token;
                const newRefreshToken = data.session.refresh_token;
                
                localStorage.setItem(AUTH_TOKEN_KEY, token);
                localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
                
                return token;
            }
            
            throw new Error('Failed to refresh token');
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            this.logout();
            throw error;
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

    async updateProfile(profileData) {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
            });

            const data = await processResponse(response);
            
            if (data && data.user) {
                localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    },

    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    getRefreshToken() {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    getCurrentUser() {
        const userStr = localStorage.getItem(USER_DATA_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated() {
        return !!localStorage.getItem(AUTH_TOKEN_KEY);
    }
};

// Exportar como default para garantir uma única instância do serviço
export default authService;
