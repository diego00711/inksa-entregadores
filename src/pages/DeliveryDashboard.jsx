// src/pages/DeliveryDashboard.jsx (VERSÃO SIMPLES E FUNCIONAL)

import React, { useState, useEffect, useCallback } from 'react';
import DeliveryService from '../services/deliveryService';
import { acceptDelivery, completeDelivery } from '../services/orderService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, Truck, Star, Wifi, WifiOff, MapPin, Clock, 
  Calendar, Bell, Coffee, Timer, Zap
} from 'lucide-react';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Componente simples para pedidos ativos
const SimpleActiveOrderCard = ({ order, onAcceptOrder, onCompleteOrder }) => {
  const getStatusText = (status) => {
    const statusMap = {
      'accepted': 'Aceito',
      'preparing': 'Em Preparo',
      'ready': 'Pronto para Coleta',
      'delivering': 'Em Rota de Entrega',
      'pending': 'Pendente'
    };
    return statusMap[status] || status;
  };

  return (
    <Card className="shadow-lg border-l-4 border-orange-500">
      <CardHeader className="pb-3 bg-orange-50">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-orange-700">
              Pedido #{order.id?.substring(0, 8) || 'N/A'}
            </CardTitle>
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {getStatusText(order.status)}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-green-600">
              R$ {order.delivery_fee ? parseFloat(order.delivery_fee).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-gray-500">Taxa de entrega</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Coffee className="h-4 w-4 text-blue-600 mt-1" />
            <div>
              <p className="text-sm font-semibold">{order.restaurant_name || 'Restaurante'}</p>
              <p className="text-xs text-gray-500">Local de coleta</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-green-600 mt-1" />
            <div>
              <p className="text-sm font-semibold">{order.client_name || 'Cliente'}</p>
              <p className="text-xs text-gray-500">{order.delivery_address || 'Endereço de entrega'}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          {order.status === 'pending' && (
            <button 
              onClick={() => onAcceptOrder(order.id)} 
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              <Zap className="inline h-4 w-4 mr-1" />
              Aceitar
            </button>
          )}
          {(order.status === 'accepted' || order.status === 'ready' || order.status === 'delivering') && (
            <button 
              onClick={() => onCompleteOrder(order.id)} 
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              Marcar como Entregue
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function EnhancedDeliveryDashboard() {
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const addToast = useToast();
  
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    if (profileLoading || !profile?.id) { 
      setLoading(false); 
      return; 
    }
    
    setError('');
    try {
      const response = await DeliveryService.getDashboardStats();
      console.log('Dashboard data received:', response);
      
      // Garantir que temos dados válidos
      const statsData = response?.data || response || {};
      setDashboardStats(statsData);
      
      if (typeof statsData?.is_available === 'boolean') {
        updateProfile({ is_available: statsData.is_available });
      }
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      const errorMessage = err.message || 'Não foi possível carregar as estatísticas.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [profile, profileLoading, updateProfile, addToast]);

  useEffect(() => {
    if (!profileLoading && profile?.id) {
      setLoading(true);
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [profileLoading, profile, fetchDashboardData]);

  const toggleAvailability = async () => {
    if (!profile || profileLoading) {
      addToast("Perfil não carregado.", 'warning');
      return;
    }
    
    try {
      addToast("Atualizando disponibilidade...", 'info');
      const newAvailability = !(dashboardStats?.is_available || false);
      const updatedProfile = await DeliveryService.updateDeliveryProfile({ is_available: newAvailability });
      
      updateProfile({ is_available: updatedProfile?.is_available || false });
      setDashboardStats(prev => ({ 
        ...prev, 
        is_available: updatedProfile?.is_available || false 
      }));
      
      addToast(`Você está agora ${newAvailability ? 'ONLINE' : 'OFFLINE'}!`, 'success');
    } catch (err) {
      console.error("Erro ao atualizar disponibilidade:", err);
      addToast('Erro ao atualizar disponibilidade.', 'error');
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      addToast('Aceitando pedido...', 'info');
      await acceptDelivery(orderId);
      addToast('Pedido aceito com sucesso!', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao aceitar pedido:', err);
      addToast('Erro ao aceitar pedido.', 'error');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      addToast('Completando pedido...', 'info');
      await completeDelivery(orderId);
      addToast('Pedido marcado como entregue!', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao completar pedido:', err);
      addToast('Erro ao completar pedido.', 'error');
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Erro no Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold"
          >
            Tentar Novamente
          </button>
        </Card>
      </div>
    );
  }

  const isAvailable = dashboardStats?.is_available || false;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Olá, {profile?.first_name || 'Entregador'}!
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="p-3 bg-white rounded-full shadow-md">
            <Bell className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={toggleAvailability}
            className={`px-6 py-3 rounded-full text-white font-bold flex items-center gap-2 ${
              isAvailable 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isAvailable ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            {isAvailable ? 'ONLINE' : 'OFFLINE'}
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-green-50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              R$ {(dashboardStats?.todayEarnings || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Hoje</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {dashboardStats?.todayDeliveries || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {(dashboardStats?.avgRating || 0).toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entregas</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {dashboardStats?.totalDeliveries || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Pedidos Ativos */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Estatísticas</h3>
            <div className="text-center py-8 text-gray-500">
              <p>Dashboard funcionando corretamente!</p>
              <p className="text-sm mt-2">
                Status: {isAvailable ? 'Online' : 'Offline'} | 
                Dados carregados: {dashboardStats ? 'Sim' : 'Não'}
              </p>
            </div>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Pedidos Ativos</h2>
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
              {dashboardStats?.activeOrders?.length || 0}
            </span>
          </div>

          {dashboardStats?.activeOrders && dashboardStats.activeOrders.length > 0 ? (
            <div className="space-y-4">
              {dashboardStats.activeOrders.map(order => (
                <SimpleActiveOrderCard
                  key={order.id}
                  order={order}
                  onAcceptOrder={handleAcceptOrder}
                  onCompleteOrder={handleCompleteOrder}
                />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum pedido ativo</h3>
              <p className="text-gray-500 text-sm">
                {isAvailable 
                  ? 'Aguardando novos pedidos...' 
                  : 'Fique online para receber pedidos'
                }
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
