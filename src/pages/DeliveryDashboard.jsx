// src/pages/DeliveryDashboard.jsx (VERSÃO FINAL CORRIGIDA)

import React, { useState, useEffect, useCallback } from 'react';
import DeliveryService from '../services/deliveryService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Truck, Star, Wifi, WifiOff, MapPin } from 'lucide-react'; // Adicionado MapPin
import { useProfile } from '../context/DeliveryProfileContext';
import { useToast } from '../context/ToastContext';

// Componente para exibir um card de pedido ativo
const ActiveOrderCard = ({ order, onAcceptOrder, onCompleteOrder }) => {
    // Melhorado o formatAddress para lidar com a combinação de campos ou string simples
    const formatAddress = (street, number, neighborhood, city, state) => {
        if (street || number || neighborhood || city || state) {
            const parts = [street, number, neighborhood, city, state].filter(Boolean);
            return parts.join(', ');
        }
        // Se os campos vierem como uma única string (ex: pickup_address da tabela orders)
        if (typeof order.pickup_address === 'string' && order.pickup_address) {
            return order.pickup_address;
        }
        return 'Endereço não informado';
    };

    return (
        <Card className="active-order-card shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-orange-600">Pedido #{order.order_id || order.id?.substring(0, 8)}</CardTitle>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    Status: <span className="font-bold text-blue-700">{order.status}</span>
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border-b border-gray-100 pb-3">
                    <h4 className="text-base font-medium text-gray-700">Cliente: {order.client_name || 'N/A'}</h4>
                    <p className="text-sm text-gray-600">Telefone: {order.client_phone || 'N/A'}</p>
                </div>

                <div className="border-b border-gray-100 pb-3">
                    <h4 className="text-base font-medium text-gray-700">Restaurante: {order.restaurant_name || 'N/A'}</h4>
                    <p className="text-sm text-gray-600">Telefone: {order.restaurant_phone || 'N/A'}</p>
                    {/* ✅ CORRIGIDO: Passando os campos do endereço do restaurante separadamente */}
                    <p className="text-sm text-gray-600">Coleta em: {formatAddress(order.restaurant_street, order.restaurant_number, order.restaurant_neighborhood, order.restaurant_city, order.restaurant_state)}</p>
                </div>
                
                <div>
                    <h4 className="text-base font-medium text-gray-700">Entrega em: {formatAddress(order.delivery_address)}</h4> {/* ✅ CORRIGIDO: Assumindo delivery_address é uma string */}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-sm font-semibold text-green-600">Corrida: R$ {order.delivery_fee ? parseFloat(order.delivery_fee).toFixed(2) : '0.00'}</span>
                    <span className="text-sm font-semibold text-gray-700">Total Pedido: R$ {order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                    {order.status === 'Pendente' && (
                        <button 
                            onClick={() => onAcceptOrder(order.id)} 
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 min-w-[120px]"
                        >
                            Aceitar Pedido
                        </button>
                    )}
                    {(order.status === 'Aceito' || order.status === 'Para Entrega') && (
                        <button 
                            onClick={() => onCompleteOrder(order.id)} 
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 min-w-[120px]"
                        >
                            Marcar como Entregue
                        </button>
                    )}
                    <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 min-w-[120px]">
                        Ver Detalhes
                    </button>
                </div>
            </CardContent>
        </Card>
    );
};


export default function DeliveryDashboard() {
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const addToast = useToast();
  const [dashboardStats, setDashboardStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    avgRating: 0,
    totalDeliveries: 0,
    activeOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    if (profileLoading || !profile?.id) { 
        setLoading(false); 
        return; 
    }
    setLoading(true);
    setError('');
    try {
      // ✅ CORRIGIDO: Passando profile.id como argumento para o serviço
      const statsData = await DeliveryService.getDashboardStats(profile.id); 
      setDashboardStats(statsData);
      if (statsData && typeof statsData.is_available === 'boolean') {
        updateProfile({ is_available: statsData.is_available });
      }
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      setError(err.message || 'Não foi possível carregar as estatísticas.');
      addToast(err.message || 'Erro ao carregar dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [profile, profileLoading, updateProfile, addToast]); // Dependências corrigidas

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const toggleAvailability = async () => {
    if (!profile || profileLoading) {
        addToast("Perfil não carregado ou em carregamento.", 'warning');
        return;
    }

    try {
      addToast("Atualizando disponibilidade...", 'info');
      const newAvailability = !profile.is_available;
      // ✅ CORRIGIDO: Passando profile.id como argumento para o serviço
      const updatedProfile = await DeliveryService.updateAvailability(profile.id, newAvailability); 
      updateProfile({ is_available: updatedProfile.is_available }); 
      addToast(`Você está agora ${newAvailability ? 'ONLINE' : 'OFFLINE'}!`, 'success');
    } catch (err) {
      console.error("Erro ao atualizar disponibilidade:", err);
      addToast(err.message || 'Erro ao atualizar disponibilidade.', 'error');
    }
  };

  const handleAcceptOrder = async (orderId) => {
      try {
          addToast(`Aceitando pedido ${orderId}...`, 'info');
          await DeliveryService.acceptDelivery(orderId); 
          addToast(`Pedido ${orderId} aceito com sucesso!`, 'success');
          fetchDashboardData(); 
      } catch (err) {
          addToast(err.message || `Erro ao aceitar pedido ${orderId}.`, 'error');
      }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
        addToast(`Completando pedido ${orderId}...`, 'info');
        await DeliveryService.completeDelivery(orderId);
        addToast(`Pedido ${orderId} marcado como entregue!`, 'success');
        fetchDashboardData(); 
    } catch (err) {
        addToast(err.message || `Erro ao completar pedido ${orderId}.`, 'error');
    }
  };

  if (profileLoading || loading) {
    return <div className="page-container flex items-center justify-center min-h-screen text-lg text-gray-700">A carregar dashboard...</div>;
  }

  if (error) {
    return <div className="page-container flex items-center justify-center min-h-screen text-lg text-red-500">Erro: {error}</div>;
  }

  const isAvailable = profile?.is_available ?? false; 

  return (
    <div className="page-container p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard do Entregador</h1>
          <p className="text-gray-500">Resumo das suas atividades e pedidos em andamento.</p>
        </div>
        <button
          onClick={toggleAvailability}
          className={`px-6 py-2 rounded-full text-white font-semibold transition-colors duration-200 flex items-center gap-2 text-lg
            ${isAvailable ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            shadow-md hover:shadow-lg
          `}
        >
          {isAvailable ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
          {isAvailable ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {renderStatCards(dashboardStats)}
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b pb-2">Pedidos Ativos</h2>
      {dashboardStats.activeOrders?.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {dashboardStats.activeOrders.map(order => (
            <ActiveOrderCard
                key={order.id}
                order={order}
                onAcceptOrder={handleAcceptOrder}
                onCompleteOrder={handleCompleteOrder}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600 p-8 bg-white rounded-lg shadow-sm">
          Nenhum pedido ativo no momento. Fique ONLINE para receber novas atribuições!
        </p>
      )}
    </div>
  );
}

// Função auxiliar para renderizar os cards de estatísticas
function renderStatCards(stats) {
    const statCards = [
        {
            title: 'Ganhos de Hoje',
            value: `R$ ${stats.todayEarnings.toFixed(2)}`,
            icon: <DollarSign className="h-5 w-5 text-green-500" />,
            color: 'text-green-700'
        },
        {
            title: 'Entregas de Hoje',
            value: `+${stats.todayDeliveries}`,
            icon: <Truck className="h-5 w-5 text-blue-500" />,
            color: 'text-blue-700'
        },
        {
            title: 'Sua Avaliação',
            value: stats.avgRating.toFixed(1),
            icon: <Star className="h-5 w-5 text-yellow-500" />,
            color: 'text-yellow-700'
        },
        {
            title: 'Entregas no Total',
            value: stats.totalDeliveries,
            icon: <Truck className="h-5 w-5 text-purple-500" />,
            color: 'text-purple-700'
        }
    ];

    return statCards.map((card, index) => (
        <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
                {card.icon}
            </CardHeader>
            <CardContent>
                <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            </CardContent>
        </Card>
    ));
}