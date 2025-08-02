// src/pages/DeliveryDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import DeliveryService from '../services/deliveryService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Truck, Star, Wifi, WifiOff } from 'lucide-react';
import { useProfile } from '../context/DeliveryProfileContext';
import { useToast } from '../context/ToastContext';

const ActiveOrderCard = ({ order, onAcceptOrder, onCompleteOrder }) => {
    const formatAddress = (address) => address || 'Endereço não informado';

    return (
        <Card className="active-order-card">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">
                    Pedido #{order.order_id || order.id?.substring(0, 8)}
                </CardTitle>
                <p className="text-sm text-gray-500">
                    Status: <span className="font-bold text-orange-600">{order.status}</span>
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    <h4 className="text-base font-medium">Cliente: {order.client_name || 'N/A'}</h4>
                    <p className="text-sm text-gray-600">Telefone: {order.client_phone || 'N/A'}</p>
                </div>
                <div>
                    <h4 className="text-base font-medium">Restaurante: {order.restaurant_name || 'N/A'}</h4>
                    <p className="text-sm text-gray-600">Telefone: {order.restaurant_phone || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Coleta em: {formatAddress(order.pickup_address)}</p>
                </div>
                <div>
                    <h4 className="text-base font-medium">Entrega em: {formatAddress(order.delivery_address)}</h4>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-sm font-semibold text-green-600">
                        Corrida: R$ {order.delivery_fee ? parseFloat(order.delivery_fee).toFixed(2) : '0.00'}
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                        Total: R$ {order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}
                    </span>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                    {order.status === 'Pendente' && (
                        <button 
                            onClick={() => onAcceptOrder(order.id)} 
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Aceitar Pedido
                        </button>
                    )}
                    {order.status === 'Para Entrega' && (
                        <button 
                            onClick={() => onCompleteOrder(order.id)} 
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Marcar como Entregue
                        </button>
                    )}
                    <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
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
        if (profileLoading) return;
        
        setLoading(true);
        setError('');
        try {
            const { data } = await DeliveryService.getDashboardStats();
            setDashboardStats(data);
        } catch (err) {
            setError(err.message || 'Não foi possível carregar as estatísticas.');
            addToast(err.message || 'Erro ao carregar dashboard', 'error');
        } finally {
            setLoading(false);
        }
    }, [profileLoading, addToast]);

    const toggleAvailability = async () => {
        if (!profile) return;

        try {
            addToast("Atualizando disponibilidade...", 'info');
            const newAvailability = !profile.is_available;
            const { data } = await DeliveryService.updateAvailability(newAvailability);
            updateProfile({ is_available: data.is_available });
            addToast(`Você está agora ${newAvailability ? 'ONLINE' : 'OFFLINE'}!`, 'success');
        } catch (err) {
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

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    if (profileLoading || loading) {
        return <div className="page-container text-center">A carregar dashboard...</div>;
    }

    if (error) {
        return <div className="page-container text-center text-red-500">Erro: {error}</div>;
    }

    const isAvailable = profile?.is_available ?? false;

    return (
        <div className="page-container p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard do Entregador</h1>
                    <p className="text-gray-500">Resumo das suas atividades e pedidos em andamento.</p>
                </div>
                <button
                    onClick={toggleAvailability}
                    className={`px-5 py-2 rounded-full text-white font-semibold transition-colors duration-200 flex items-center gap-2
                        ${isAvailable ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                    `}
                >
                    {isAvailable ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                    {isAvailable ? 'ONLINE' : 'OFFLINE'}
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {/* Cards de estatísticas */}
                {renderStatCards(dashboardStats)}
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b pb-2">Pedidos Ativos</h2>
            {dashboardStats.activeOrders?.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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