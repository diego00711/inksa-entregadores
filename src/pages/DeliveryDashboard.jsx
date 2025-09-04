// src/pages/DeliveryDashboard.jsx (VERSÃO FINAL, COMPLETA E CORRIGIDA)

import React, { useState, useEffect, useCallback } from 'react';
import DeliveryService from '../services/deliveryService';
import { acceptDelivery, completeDelivery } from '../services/orderService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, Truck, Star, Wifi, WifiOff, MapPin, Clock, TrendingUp, 
  Award, Target, Calendar, Activity, Navigation, Users, Zap, Bell,
  Coffee, Timer, Route, Trophy, ChevronUp, ChevronDown, Flame
} from 'lucide-react';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ========== COMPONENTE DE ANIMAÇÃO ==========
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (isNaN(value)) value = 0; // Garante que o valor não seja NaN
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
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
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
              : `Faltam R$ ${(goal - current > 0 ? goal - current : 0).toFixed(2)}`
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
  const topPercentage = total > 0 ? ((total - position + 1) / total * 100).toFixed(0) : 0;
  
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
            <div className="text-3xl font-bold text-orange-700">#{position || 0}</div>
            <p className="text-xs text-gray-600">de {total || 0} entregadores</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">Top {topPercentage}%</div>
            {position > 0 && position <= 3 && (
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
              formatter={(value) => `R$ ${value.toFixed(2)}`}
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
    const calculateTime = () => {
      if (!order.created_at) return;
      const created = new Date(order.created_at);
      const now = new Date();
      const diff = Math.floor((now - created) / 60000); // Diferença em minutos
      setTimeElapsed(diff);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000);
    
    return () => clearInterval(timer);
  }, [order.created_at]);

  const formatAddress = (street, number, neighborhood, deliveryAddress) => {
    if (street || number || neighborhood) {
      const parts = [street, number, neighborhood].filter(Boolean);
      return parts.join(', ');
    }
    if (typeof deliveryAddress === 'string' && deliveryAddress) {
      return deliveryAddress;
    }
    return 'Endereço não informado';
  };

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

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ready': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'delivering': return 'bg-teal-100 text-teal-800 border-teal-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-orange-500">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-orange-700">
              Pedido #{order.id?.substring(0, 8)}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
              {order.status !== 'pending' && (
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
                {formatAddress(order.restaurant_street, order.restaurant_number, order.restaurant_neighborhood, null)}
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
              <p className="text-xs text-gray-500">{formatAddress(null, null, null, order.delivery_address)}</p>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Total do pedido:</span>
            <span className="font-semibold">R$ {order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}</span>
          </div>
        </div>
        
        {/* Botões de ação */}
        <div className="flex gap-2 pt-2">
          {order.status === 'pending' && (
            <button 
              onClick={() => onAcceptOrder(order.id)} 
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              <Zap className="inline h-4 w-4 mr-1" />
              Aceitar Agora
            </button>
          )}
          {(order.status === 'accepted' || order.status === 'ready' || order.status === 'delivering') && (
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
    weeklyEarnings: [],
    dailyGoal: 0,
    onlineMinutes: 0,
    ranking: 0,
    totalDeliverers: 0,
    distanceToday: 0,
    nextPayment: { date: '--/--', amount: 0 },
    streak: 0,
    peakHours: null,
    is_available: false
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const achievements = [
    { name: 'Primeira Entrega', icon: '🎯', unlocked: true },
    { name: '5 Estrelas', icon: '⭐', unlocked: true },
    { name: 'Velocista', icon: '⚡', unlocked: true },
    { name: '100 Entregas', icon: '💯', unlocked: false },
  ];

  const fetchDashboardData = useCallback(async () => {
    if (profileLoading || !profile?.id) { 
      setLoading(false); 
      return; 
    }
    setError('');
    try {
      const response = await DeliveryService.getDashboardStats();
      const statsData = response.data;
      setDashboardStats(statsData);
      if (typeof statsData.is_available === 'boolean') {
        updateProfile({ is_available: statsData.is_available });
      }
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      const errorMessage = err.response?.data?.message || err.message || 'Não foi possível carregar as estatísticas.';
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
      addToast("Perfil não carregado ou em carregamento.", 'warning');
      return;
    }
    try {
      addToast("Atualizando disponibilidade...", 'info');
      const newAvailability = !dashboardStats.is_available;
      const updatedProfile = await DeliveryService.updateDeliveryProfile({ is_available: newAvailability });
      updateProfile({ is_available: updatedProfile.is_available });
      setDashboardStats(prev => ({ ...prev, is_available: updatedProfile.is_available }));
      addToast(`Você está agora ${newAvailability ? 'ONLINE' : 'OFFLINE'}!`, 'success');
    } catch (err) {
      console.error("Erro ao atualizar disponibilidade:", err);
      const errorMessage = err.response?.data?.message || 'Erro ao atualizar disponibilidade.';
      addToast(errorMessage, 'error');
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      addToast(`Aceitando pedido...`, 'info');
      await acceptDelivery(orderId);
      addToast(`Pedido aceito com sucesso!`, 'success');
      fetchDashboardData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Erro ao aceitar pedido.`;
      addToast(errorMessage, 'error');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      addToast(`Completando pedido...`, 'info');
      await completeDelivery(orderId);
      addToast(`Pedido marcado como entregue!`, 'success');
      fetchDashboardData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Erro ao completar pedido.`;
      addToast(errorMessage, 'error');
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="page-container p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
