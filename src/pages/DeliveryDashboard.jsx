// src/pages/DeliveryDashboard.jsx (VERSÃO TURBINADA)

import React, { useState, useEffect, useCallback } from 'react';
import DeliveryService from '../services/deliveryService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, Truck, Star, Wifi, WifiOff, MapPin, Clock, TrendingUp, 
  Award, Target, Calendar, Activity, Navigation, Users, Zap, Bell,
  Coffee, Timer, Route, Trophy, ChevronUp, ChevronDown, Flame
} from 'lucide-react';
import { useProfile } from '../context/DeliveryProfileContext';
import { useToast } from '../context/ToastContext';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, PieChart, Pie
} from 'recharts';

// ========== COMPONENTES DE ANIMAÇÃO ==========
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = (value - displayValue) / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      setDisplayValue(prev => {
        const newValue = prev + increment;
        if (currentStep >= steps) {
          clearInterval(timer);
          return value;
        }
        return newValue;
      });
    }, stepDuration);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return (
    <span>{prefix}{displayValue.toFixed(decimals)}{suffix}</span>
  );
};

// ========== COMPONENTE DE META DIÁRIA ==========
const DailyGoalCard = ({ current, goal }) => {
  const percentage = Math.min((current / goal) * 100, 100);
  const isCompleted = percentage >= 100;
  
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold text-purple-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Meta Diária
          </CardTitle>
          {isCompleted && <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progresso</span>
            <span className={`font-bold ${isCompleted ? 'text-green-600' : 'text-purple-600'}`}>
              R$ {current.toFixed(2)} / R$ {goal.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted 
                  ? 'bg-gradient-to-r from-green-400 to-green-600' 
                  : 'bg-gradient-to-r from-purple-400 to-pink-500'
              }`}
              style={{ width: `${percentage}%` }}
            >
              <div className="h-full bg-white/30 animate-pulse"></div>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500">
            {isCompleted 
              ? '🎉 Parabéns! Meta atingida!' 
              : `Faltam R$ ${(goal - current).toFixed(2)}`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// ========== COMPONENTE DE TEMPO ONLINE ==========
const OnlineTimeCard = ({ minutes }) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-blue-800 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Tempo Online
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-blue-700">
          {hours}h {mins}min
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-sm text-gray-600">Ativo agora</span>
        </div>
      </CardContent>
    </Card>
  );
};

// ========== COMPONENTE DE RANKING ==========
const RankingCard = ({ position, total }) => {
  const topPercentage = ((total - position + 1) / total * 100).toFixed(0);
  
  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-orange-800 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange-600" />
          Ranking Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-orange-700">#{position}</div>
            <p className="text-xs text-gray-600">de {total} entregadores</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">Top {topPercentage}%</div>
            {position <= 3 && (
              <div className="mt-1">
                {position === 1 && <span className="text-2xl">🥇</span>}
                {position === 2 && <span className="text-2xl">🥈</span>}
                {position === 3 && <span className="text-2xl">🥉</span>}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ========== COMPONENTE DE GRÁFICO DE GANHOS ==========
const EarningsChart = ({ data }) => {
  return (
    <Card className="col-span-full lg:col-span-2 shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Ganhos dos Últimos 7 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
              itemStyle={{ color: '#10b981' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#10b981" 
              strokeWidth={2}
              fill="url(#colorEarnings)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// ========== COMPONENTE DE PEDIDO ATIVO MELHORADO ==========
const EnhancedActiveOrderCard = ({ order, onAcceptOrder, onCompleteOrder }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 60000); // Atualiza a cada minuto
    return () => clearInterval(timer);
  }, []);

  const formatAddress = (street, number, neighborhood, city, state) => {
    if (street || number || neighborhood || city || state) {
      const parts = [street, number, neighborhood, city, state].filter(Boolean);
      return parts.join(', ');
    }
    if (typeof order.pickup_address === 'string' && order.pickup_address) {
      return order.pickup_address;
    }
    return 'Endereço não informado';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Aceito': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Para Entrega': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-orange-500">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-orange-700">
              Pedido #{order.order_id || order.id?.substring(0, 8)}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              {order.status !== 'Pendente' && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {timeElapsed} min
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              R$ {order.delivery_fee ? parseFloat(order.delivery_fee).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-gray-500">Taxa de entrega</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-3">
          {/* Local de Coleta */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Coffee className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">{order.restaurant_name || 'Restaurante'}</p>
              <p className="text-xs text-gray-500">
                {formatAddress(order.restaurant_street, order.restaurant_number, order.restaurant_neighborhood, order.restaurant_city, order.restaurant_state)}
              </p>
            </div>
          </div>
          
          {/* Linha de conexão visual */}
          <div className="ml-5 border-l-2 border-dashed border-gray-300 h-4"></div>
          
          {/* Local de Entrega */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <MapPin className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">{order.client_name || 'Cliente'}</p>
              <p className="text-xs text-gray-500">{formatAddress(order.delivery_address)}</p>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Distância estimada:</span>
            <span className="font-semibold">2.5 km</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Tempo estimado:</span>
            <span className="font-semibold">15 min</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Total do pedido:</span>
            <span className="font-semibold">R$ {order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}</span>
          </div>
        </div>
        
        {/* Botões de ação */}
        <div className="flex gap-2 pt-2">
          {order.status === 'Pendente' && (
            <button 
              onClick={() => onAcceptOrder(order.id)} 
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              <Zap className="inline h-4 w-4 mr-1" />
              Aceitar Agora
            </button>
          )}
          {(order.status === 'Aceito' || order.status === 'Para Entrega') && (
            <button 
              onClick={() => onCompleteOrder(order.id)} 
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              ✓ Marcar como Entregue
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ========== COMPONENTE DE NOTIFICAÇÕES ==========
const NotificationBanner = ({ type, message, icon }) => {
  const bannerStyles = {
    promo: 'bg-gradient-to-r from-purple-500 to-pink-500',
    alert: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    info: 'bg-gradient-to-r from-blue-500 to-cyan-500'
  };

  return (
    <div className={`${bannerStyles[type]} text-white p-3 rounded-lg shadow-lg mb-4 animate-pulse`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm">{message}</span>
      </div>
    </div>
  );
};

// ========== COMPONENTE DE CONQUISTAS ==========
const AchievementsSection = ({ achievements }) => {
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Award className="h-5 w-5 text-purple-600" />
          Suas Conquistas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 flex-wrap">
          {achievements.map((achievement, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg text-center transition-all duration-300 ${
                achievement.unlocked 
                  ? 'bg-gradient-to-br from-purple-100 to-pink-100 transform hover:scale-110' 
                  : 'bg-gray-100 opacity-50'
              }`}
            >
              <div className="text-2xl mb-1">{achievement.icon}</div>
              <p className="text-xs font-semibold">{achievement.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ========== COMPONENTE PRINCIPAL DO DASHBOARD ==========
export default function EnhancedDeliveryDashboard() {
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const addToast = useToast();
  
  const [dashboardStats, setDashboardStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    avgRating: 0,
    totalDeliveries: 0,
    activeOrders: [],
    weeklyEarnings: [
      { day: 'Seg', value: 120 },
      { day: 'Ter', value: 180 },
      { day: 'Qua', value: 150 },
      { day: 'Qui', value: 200 },
      { day: 'Sex', value: 280 },
      { day: 'Sáb', value: 320 },
      { day: 'Dom', value: 250 }
    ],
    dailyGoal: 300,
    onlineMinutes: 245,
    ranking: 5,
    totalDeliverers: 50,
    distanceToday: 28.5,
    nextPayment: { date: '05/09', amount: 1580.00 },
    streak: 7,
    peakHours: { start: '11:30', end: '13:30', bonus: 1.5 }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNotification, setShowNotification] = useState(true);

  // Conquistas mockadas
  const achievements = [
    { name: 'Primeira Entrega', icon: '🎯', unlocked: true },
    { name: '5 Estrelas', icon: '⭐', unlocked: true },
    { name: 'Velocista', icon: '⚡', unlocked: true },
    { name: '100 Entregas', icon: '💯', unlocked: false },
    { name: 'Rei da Noite', icon: '🌙', unlocked: false },
    { name: 'Sem Reclamações', icon: '😊', unlocked: true }
  ];

  const fetchDashboardData = useCallback(async () => {
    if (profileLoading || !profile?.id) { 
      setLoading(false); 
      return; 
    }
    setLoading(true);
    setError('');
    try {
      const statsData = await DeliveryService.getDashboardStats(profile.id);
      setDashboardStats(prev => ({
        ...prev,
        ...statsData
      }));
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
  }, [profile, profileLoading, updateProfile, addToast]);

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
    return (
      <div className="page-container p-6 bg-gray-50 min-h-screen">
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
      <div className="page-container flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ops! Algo deu errado</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchDashboardData}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const isAvailable = profile?.is_available ?? false;
  const projectedEarnings = dashboardStats.todayEarnings * (480 / dashboardStats.onlineMinutes);

  return (
    <div className="page-container p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header com Status Online/Offline */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Olá, {profile?.name || 'Entregador'}! 👋
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all">
            <Bell className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={toggleAvailability}
            className={`px-6 py-3 rounded-full text-white font-bold transition-all duration-300 flex items-center gap-2 text-lg
              ${isAvailable 
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
              }
              shadow-lg hover:shadow-xl transform hover:scale-105
            `}
          >
            {isAvailable ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
            {isAvailable ? 'ONLINE' : 'OFFLINE'}
          </button>
        </div>
      </div>

      {/* Notificação de Horário de Pico */}
      {showNotification && dashboardStats.peakHours && (
        <NotificationBanner
          type="promo"
          message={`🔥 Horário de pico: ${dashboardStats.peakHours.start} - ${dashboardStats.peakHours.end} | Ganhe ${dashboardStats.peakHours.bonus}x mais!`}
          icon={<Flame className="h-5 w-5" />}
        />
      )}

      {/* Cards de Estatísticas Principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-8">
        {/* Card de Ganhos */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ganhos de Hoje</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              <AnimatedNumber value={dashboardStats.todayEarnings} prefix="R$ " decimals={2} />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-600">+23% vs ontem</span>
            </div>
          </CardContent>
        </Card>

        {/* Card de Entregas */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Entregas Hoje</CardTitle>
            <Truck className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              <AnimatedNumber value={dashboardStats.todayDeliveries} prefix="+" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Route className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-gray-600">{dashboardStats.distanceToday} km rodados</span>
            </div>
          </CardContent>
        </Card>

        {/* Card de Avaliação */}
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sua Avaliação</CardTitle>
            <Star className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700">
              <AnimatedNumber value={dashboardStats.avgRating} decimals={1} />
            </div>
            <div className="flex gap-0.5 mt-1">
              {[1,2,3,4,5].map(i => (
                <Star 
                  key={i} 
                  className={`h-3 w-3 ${i <= Math.floor(dashboardStats.avgRating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card de Total de Entregas */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Entregas</CardTitle>
            <Trophy className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              <AnimatedNumber value={dashboardStats.totalDeliveries} />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Flame className="h-3 w-3 text-orange-500" />
              <span className="text-xs text-gray-600">{dashboardStats.streak} dias seguidos</span>
            </div>
          </CardContent>
        </Card>

        {/* Card de Próximo Pagamento */}
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Próximo Pagamento</CardTitle>
            <Calendar className="h-5 w-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">
              R$ {dashboardStats.nextPayment.amount.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Dia {dashboardStats.nextPayment.date}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha de cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <DailyGoalCard current={dashboardStats.todayEarnings} goal={dashboardStats.dailyGoal} />
        <OnlineTimeCard minutes={dashboardStats.onlineMinutes} />
        <RankingCard position={dashboardStats.ranking} total={dashboardStats.totalDeliverers} />
        
        {/* Card de Projeção */}
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-indigo-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Projeção do Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">
              R$ {projectedEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Se continuar neste ritmo
            </p>
            <div className="mt-2 flex items-center gap-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-gray-600">Acelere para ganhar mais!</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Ganhos e Conquistas */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-8">
        <EarningsChart data={dashboardStats.weeklyEarnings} />
        <AchievementsSection achievements={achievements} />
      </div>

      {/* Seção de Pedidos Ativos */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="h-6 w-6 text-orange-600" />
            Pedidos Ativos
            {dashboardStats.activeOrders?.length > 0 && (
              <span className="ml-2 px-3 py-1 bg-orange-500 text-white text-sm rounded-full font-bold animate-pulse">
                {dashboardStats.activeOrders.length}
              </span>
            )}
          </h2>
          {dashboardStats.activeOrders?.length > 0 && (
            <button className="text-sm text-orange-600 hover:text-orange-700 font-semibold">
              Ver mapa completo →
            </button>
          )}
        </div>

        {dashboardStats.activeOrders?.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {dashboardStats.activeOrders.map(order => (
              <EnhancedActiveOrderCard
                key={order.id}
                order={order}
                onAcceptOrder={handleAcceptOrder}
                onCompleteOrder={handleCompleteOrder}
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Nenhum pedido disponível no momento
              </h3>
              <p className="text-gray-600 mb-4">
                {isAvailable 
                  ? 'Fique tranquilo! Novos pedidos aparecerão em breve.' 
                  : 'Fique ONLINE para começar a receber pedidos!'
                }
              </p>
              {!isAvailable && (
                <button 
                  onClick={toggleAvailability}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-bold transition-all transform hover:scale-105"
                >
                  Ficar Online Agora
                </button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Dicas Rápidas */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Dica do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            💡 Trabalhe nos horários de pico para ganhar bônus especiais! 
            Hoje o melhor horário é das {dashboardStats.peakHours.start} às {dashboardStats.peakHours.end}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
