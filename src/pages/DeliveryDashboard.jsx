// src/pages/DeliveryDashboard.jsx - VERSÃO MODERNIZADA E SURPREENDENTE

import React, { useState, useEffect, useCallback } from 'react';
import DeliveryService from '../services/deliveryService';
import { acceptDelivery, completeDelivery } from '../services/orderService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, Truck, Star, Wifi, WifiOff, MapPin, Clock, 
  Calendar, Bell, Coffee, Timer, Zap, RefreshCw, TrendingUp,
  Target, Award, Activity, ChevronRight, ExternalLink, Phone
} from 'lucide-react';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Componente de Card Estatística Moderno
const ModernStatCard = ({ title, value, icon: Icon, color, trend, subtitle, onClick }) => (
  <Card 
    className={`relative overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br ${color} border-0`}
    onClick={onClick}
  >
    <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
      <Icon className="w-full h-full" />
    </div>
    <CardContent className="p-6 relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <div className="flex items-center text-white/80 text-sm">
            <TrendingUp className="h-4 w-4 mr-1" />
            +{trend}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-white/80 text-sm font-medium">{title}</div>
      {subtitle && <div className="text-white/60 text-xs mt-1">{subtitle}</div>}
    </CardContent>
  </Card>
);

// Componente de Pedido Ativo Moderno
const ModernActiveOrderCard = ({ order, onAcceptOrder, onCompleteOrder }) => {
  const getStatusData = (status) => {
    const statusMap = {
      'pending': { text: 'Aguardando', color: 'bg-yellow-500', pulse: true },
      'accepted': { text: 'Aceito', color: 'bg-blue-500', pulse: false },
      'ready': { text: 'Pronto', color: 'bg-purple-500', pulse: true },
      'delivering': { text: 'Entregando', color: 'bg-green-500', pulse: true }
    };
    return statusMap[status] || { text: status, color: 'bg-gray-500', pulse: false };
  };

  const statusData = getStatusData(order.status);

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>
      
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-gray-800">
                #{order.id?.substring(0, 8) || 'N/A'}
              </h3>
              <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${statusData.color} ${statusData.pulse ? 'animate-pulse' : ''}`}>
                {statusData.text}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              R$ {order.delivery_fee ? parseFloat(order.delivery_fee).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-gray-500">Taxa de entrega</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Coffee className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{order.restaurant_name || 'Restaurante'}</p>
                <p className="text-sm text-gray-600">Local de coleta</p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{order.client_name || 'Cliente'}</p>
                <p className="text-sm text-gray-600 truncate">{order.delivery_address || 'Endereço de entrega'}</p>
              </div>
              <Phone className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            {order.status === 'pending' && (
              <button 
                onClick={() => onAcceptOrder(order.id)} 
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Zap className="h-4 w-4" />
                Aceitar Pedido
              </button>
            )}
            {(order.status === 'accepted' || order.status === 'ready' || order.status === 'delivering') && (
              <button 
                onClick={() => onCompleteOrder(order.id)} 
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Award className="h-4 w-4" />
                Marcar Entregue
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de Performance Ring
const PerformanceRing = ({ percentage, label, color }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${percentage * circumference / 100} ${circumference}`;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-800">{percentage}%</span>
        </div>
      </div>
      <span className="text-sm text-gray-600 mt-2">{label}</span>
    </div>
  );
};

// Loading Skeleton Moderno
const ModernLoader = () => (
  <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
    <div className="animate-pulse">
      <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3 mb-6"></div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-64 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
        <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
      </div>
    </div>
  </div>
);

export default function ModernDeliveryDashboard() {
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const addToast = useToast();
  
  const [dashboardStats, setDashboardStats] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboardData = useCallback(async (isBackgroundUpdate = false) => {
    if (profileLoading || !profile?.id) { 
      setInitialLoading(false); 
      return; 
    }
    
    if (isBackgroundUpdate && dashboardStats) {
      setBackgroundLoading(true);
    } else if (!dashboardStats) {
      setInitialLoading(true);
    }
    
    setError('');
    try {
      const response = await DeliveryService.getDashboardStats();
      const statsData = response?.data || response || {};
      setDashboardStats(statsData);
      setLastUpdated(new Date());
      
      if (typeof statsData?.is_available === 'boolean') {
        updateProfile({ is_available: statsData.is_available });
      }
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      const errorMessage = err.message || 'Não foi possível carregar as estatísticas.';
      
      if (!dashboardStats) {
        setError(errorMessage);
        addToast(errorMessage, 'error');
      }
    } finally {
      setInitialLoading(false);
      setBackgroundLoading(false);
    }
  }, [profile, profileLoading, updateProfile, addToast, dashboardStats]);

  useEffect(() => {
    if (!profileLoading && profile?.id) {
      fetchDashboardData(false);
      const interval = setInterval(() => fetchDashboardData(true), 30000);
      return () => clearInterval(interval);
    }
  }, [profileLoading, profile?.id]);

  const toggleAvailability = async () => {
    if (!profile || profileLoading) {
      addToast("Perfil não carregado.", 'warning');
      return;
    }
    
    try {
      const newAvailability = !(dashboardStats?.is_available || false);
      const updatedProfile = await DeliveryService.updateDeliveryProfile({ is_available: newAvailability });
      
      updateProfile({ is_available: updatedProfile?.is_available || false });
      setDashboardStats(prev => ({ 
        ...prev, 
        is_available: updatedProfile?.is_available || false 
      }));
      
      addToast(`Agora você está ${newAvailability ? 'ONLINE' : 'OFFLINE'}!`, 'success');
    } catch (err) {
      addToast('Erro ao atualizar disponibilidade.', 'error');
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await acceptDelivery(orderId);
      addToast('Pedido aceito com sucesso!', 'success');
      fetchDashboardData(true);
    } catch (err) {
      addToast('Erro ao aceitar pedido.', 'error');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await completeDelivery(orderId);
      addToast('Pedido entregue com sucesso!', 'success');
      fetchDashboardData(true);
    } catch (err) {
      addToast('Erro ao completar pedido.', 'error');
    }
  };

  if (profileLoading || initialLoading) return <ModernLoader />;

  if (error && !dashboardStats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <Card className="p-8 max-w-md text-center shadow-2xl border-0">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ops! Algo deu errado</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => fetchDashboardData(false)}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Tentar Novamente
          </button>
        </Card>
      </div>
    );
  }

  const isAvailable = dashboardStats?.is_available || false;
  const todayEarnings = dashboardStats?.todayEarnings || 0;
  const todayDeliveries = dashboardStats?.todayDeliveries || 0;
  const avgRating = dashboardStats?.avgRating || 0;
  const totalDeliveries = dashboardStats?.totalDeliveries || 0;
  const onlineMinutes = dashboardStats?.onlineMinutes || 0;
  const dailyGoal = dashboardStats?.dailyGoal || 100;

  const goalProgress = Math.min((todayEarnings / dailyGoal) * 100, 100);
  const ratingProgress = (avgRating / 5) * 100;
  const efficiencyProgress = Math.min((todayDeliveries / 10) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header Moderno */}
      <div className="bg-white/70 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Olá, {profile?.first_name || 'Entregador'}! 👋
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-600 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                {lastUpdated && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Activity className={`h-3 w-3 ${backgroundLoading ? 'animate-pulse' : ''}`} />
                    Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 items-center">
              <button 
                onClick={() => fetchDashboardData(true)}
                className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50"
                disabled={backgroundLoading}
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${backgroundLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <button className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </button>
              
              <button
                onClick={toggleAvailability}
                className={`px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                  isAvailable 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                    : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                }`}
              >
                {isAvailable ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                {isAvailable ? 'ONLINE' : 'OFFLINE'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Cards de Estatísticas Modernos */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <ModernStatCard
            title="Ganhos Hoje"
            value={`R$ ${todayEarnings.toFixed(2)}`}
            icon={DollarSign}
            color="from-green-500 to-emerald-600"
            trend={12}
            subtitle={`Meta: R$ ${dailyGoal.toFixed(2)}`}
          />
          
          <ModernStatCard
            title="Entregas Hoje"
            value={todayDeliveries}
            icon={Truck}
            color="from-blue-500 to-indigo-600"
            trend={8}
            subtitle="Excelente ritmo!"
          />
          
          <ModernStatCard
            title="Avaliação Média"
            value={avgRating.toFixed(1)}
            icon={Star}
            color="from-yellow-500 to-orange-500"
            subtitle="Muito bom!"
          />
          
          <ModernStatCard
            title="Total Entregas"
            value={totalDeliveries}
            icon={Award}
            color="from-purple-500 to-pink-500"
            subtitle="desde o início"
          />
        </div>

        {/* Seção Principal */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Performance Dashboard */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Target className="h-6 w-6 text-orange-500" />
                  Performance de Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-8 mb-8">
                  <PerformanceRing 
                    percentage={Math.round(goalProgress)} 
                    label="Meta Diária" 
                    color="#10b981" 
                  />
                  <PerformanceRing 
                    percentage={Math.round(ratingProgress)} 
                    label="Satisfação" 
                    color="#f59e0b" 
                  />
                  <PerformanceRing 
                    percentage={Math.round(efficiencyProgress)} 
                    label="Eficiência" 
                    color="#3b82f6" 
                  />
                </div>
                
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tempo Online Hoje</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.floor(onlineMinutes / 60)}h {onlineMinutes % 60}min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Status</p>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                        isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        {isAvailable ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pedidos Ativos Modernos */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Pedidos Ativos</h2>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-3 py-1 rounded-full font-bold">
                {dashboardStats?.activeOrders?.length || 0}
              </div>
            </div>

            {dashboardStats?.activeOrders && dashboardStats.activeOrders.length > 0 ? (
              <div className="space-y-4">
                {dashboardStats.activeOrders.map(order => (
                  <ModernActiveOrderCard
                    key={order.id}
                    order={order}
                    onAcceptOrder={handleAcceptOrder}
                    onCompleteOrder={handleCompleteOrder}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Tudo tranquilo por aqui!</h3>
                <p className="text-gray-600 mb-4">
                  {isAvailable 
                    ? 'Aguardando novos pedidos chegarem...' 
                    : 'Fique online para receber pedidos'
                  }
                </p>
                {!isAvailable && (
                  <button
                    onClick={toggleAvailability}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Ficar Online
                  </button>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
