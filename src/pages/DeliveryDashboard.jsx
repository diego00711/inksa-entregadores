// src/pages/DeliveryDashboard.jsx - VERSÃO APRIMORADA (polling inteligente + pickup code)

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import DeliveryService from '../services/deliveryService';
import { acceptDelivery, completeDelivery } from '../services/orderService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, Truck, Star, Wifi, WifiOff, MapPin, Clock,
  Calendar, Bell, Target, Award, Activity, RefreshCw, ExternalLink,
  Phone, Navigation, KeyRound, Zap, CheckCircle
} from 'lucide-react';

import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/* ------------------------- helpers ------------------------- */

// debounce simples sem libs
const useDebouncedCallback = (fn, delay = 600) => {
  const timer = useRef(null);
  return useCallback((...args) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
};

// formatação segura
const toNumber = (v) => (typeof v === 'number' ? v : parseFloat(v || '0')) || 0;

/* ------------------------- UI atoms ------------------------- */

const ModernStatCard = memo(({ title, value, icon: Icon, color, trend, subtitle, onClick }) => (
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
        {typeof trend === 'number' && (
          <div className="flex items-center text-white/80 text-sm">
            <Award className="h-4 w-4 mr-1" />
            +{trend}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
        {value}
      </div>
      <div className="text-white/80 text-sm font-medium">{title}</div>
      {subtitle && <div className="text-white/60 text-xs mt-1">{subtitle}</div>}
    </CardContent>
  </Card>
));

const PerformanceRing = memo(({ percentage, label, color }) => {
  const p = Math.max(0, Math.min(100, percentage || 0));
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(p * circumference) / 100} ${circumference}`;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100" aria-label={label}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200" />
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
          <span className="text-xl font-bold text-gray-800">{Math.round(p)}%</span>
        </div>
      </div>
      <span className="text-sm text-gray-600 mt-2">{label}</span>
    </div>
  );
});

/* --------------------- Active order card --------------------- */

const ModernActiveOrderCard = memo(({ order, onAcceptOrder, onCompleteOrder }) => {
  const status = order?.status;
  const badge = useMemo(() => {
    const map = {
      pending: { t: 'Aguardando', cls: 'bg-yellow-500' },
      accepted: { t: 'Aceito', cls: 'bg-blue-500' },
      ready: { t: 'Pronto', cls: 'bg-purple-500' },
      accepted_by_delivery: { t: 'Aguardando Retirada', cls: 'bg-fuchsia-600' },
      delivering: { t: 'Entregando', cls: 'bg-green-600' },
      delivered: { t: 'Entregue', cls: 'bg-gray-500' }
    };
    return map[status] || { t: status || '—', cls: 'bg-gray-500' };
  }, [status]);

  const showPickup = status === 'accepted_by_delivery' && order?.pickup_code;

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-800">#{order?.id?.substring(0, 8) || 'N/A'}</h3>
            <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${badge.cls}`}>{badge.t}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              R$ {toNumber(order?.delivery_fee).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Taxa de entrega</p>
          </div>
        </div>

        {showPickup && (
          <div className="mb-4 p-4 rounded-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-purple-600 p-2 rounded-full">
                  <KeyRound className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Código de Retirada</p>
                  <p className="text-sm text-purple-600">Mostre no balcão do restaurante</p>
                </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border-2 border-purple-300 shadow">
                <span className="text-2xl font-extrabold text-purple-700 tracking-widest">{order.pickup_code}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExternalLink className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{order.restaurant_name || 'Restaurante'}</p>
              <p className="text-sm text-gray-600">Local de coleta</p>
            </div>
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

          <div className="flex gap-3 pt-2">
            {status === 'pending' && (
              <button
                onClick={() => onAcceptOrder(order.id)}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Zap className="h-4 w-4" />
                Aceitar Pedido
              </button>
            )}

            {(status === 'accepted' || status === 'ready' || status === 'accepted_by_delivery' || status === 'delivering') && (
              <button
                onClick={() => onCompleteOrder(order.id)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <CheckCircle className="h-4 w-4" />
                Marcar Entregue
              </button>
            )}

            {order.delivery_address && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-3 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                Ver rota
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/* ------------------------ main dashboard ------------------------ */

export default function ModernDeliveryDashboard() {
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const addToast = useToast();

  const [dashboardStats, setDashboardStats] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (profileLoading || !profile?.id) {
      setInitialLoading(false);
      return;
    }
    if (isBackground && dashboardStats) setBackgroundLoading(true);
    else if (!dashboardStats) setInitialLoading(true);

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
      const msg = err?.message || 'Não foi possível carregar as estatísticas.';
      if (!dashboardStats) setError(msg);
      addToast(msg, 'error');
    } finally {
      setInitialLoading(false);
      setBackgroundLoading(false);
    }
  }, [profileLoading, profile?.id, dashboardStats, updateProfile, addToast]);

  // polling com pausa quando a aba está oculta
  useEffect(() => {
    if (profileLoading || !profile?.id) return;
    let intervalId;

    const start = () => {
      intervalId = window.setInterval(() => fetchDashboardData(true), 30000);
    };
    const stop = () => intervalId && window.clearInterval(intervalId);

    fetchDashboardData(false);
    start();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData(true);
        start();
      } else {
        stop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [profileLoading, profile?.id, fetchDashboardData]);

  const debouncedRefresh = useDebouncedCallback(() => fetchDashboardData(true), 700);

  const toggleAvailability = async () => {
    if (!profile || profileLoading) return addToast('Perfil não carregado.', 'warning');
    try {
      const next = !(dashboardStats?.is_available || false);
      const updated = await DeliveryService.updateDeliveryProfile({ is_available: next });
      updateProfile({ is_available: !!updated?.is_available });
      setDashboardStats((prev) => ({ ...(prev || {}), is_available: !!updated?.is_available }));
      addToast(`Agora você está ${next ? 'ONLINE' : 'OFFLINE'}!`, 'success');
    } catch {
      addToast('Erro ao atualizar disponibilidade.', 'error');
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await acceptDelivery(orderId);
      addToast('Pedido aceito com sucesso!', 'success');
      fetchDashboardData(true);
    } catch {
      addToast('Erro ao aceitar pedido.', 'error');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await completeDelivery(orderId);
      addToast('Pedido entregue com sucesso!', 'success');
      fetchDashboardData(true);
    } catch {
      addToast('Erro ao completar pedido.', 'error');
    }
  };

  if (initialLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen animate-pulse">
        <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3 mb-6" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-64 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl" />
          <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !dashboardStats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <Card className="p-8 max-w-md text-center shadow-2xl border-0">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ops! Algo deu errado</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchDashboardData(false)}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Tentar Novamente
          </button>
        </Card>
      </div>
    );
  }

  const isAvailable = dashboardStats?.is_available || false;
  const todayEarnings = toNumber(dashboardStats?.todayEarnings);
  const todayDeliveries = dashboardStats?.todayDeliveries || 0;
  const avgRating = toNumber(dashboardStats?.avgRating);
  const totalDeliveries = dashboardStats?.totalDeliveries || 0;
  const onlineMinutes = dashboardStats?.onlineMinutes || 0;
  const dailyGoal = toNumber(dashboardStats?.dailyGoal || 100);

  const goalProgress = Math.min((todayEarnings / (dailyGoal || 1)) * 100, 100);
  const ratingProgress = Math.min((avgRating / 5) * 100, 100);
  const efficiencyProgress = Math.min((todayDeliveries / 10) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* progress bar fina durante background load */}
      {backgroundLoading && <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-red-400 animate-pulse" />}

      {/* Header */}
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
                    Atualizado às {lastUpdated.toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={debouncedRefresh}
                className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50"
                disabled={backgroundLoading}
                title="Atualizar agora"
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${backgroundLoading ? 'animate-spin' : ''}`} />
              </button>

              <button className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg transition-all duration-300 border border-gray-200/50 relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </button>

              <button
                onClick={toggleAvailability}
                className={`px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl ${
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
        {/* Stat cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <ModernStatCard
            title="Ganhos Hoje"
            value={`R$ ${todayEarnings.toFixed(2)}`}
            icon={DollarSign}
            color="from-green-500 to-emerald-600"
            trend={12}
            subtitle={`Meta: R$ ${dailyGoal.toFixed(2)}`}
            onClick={() => window.location.assign('/delivery/ganhos')}
          />
          <ModernStatCard
            title="Entregas Hoje"
            value={todayDeliveries}
            icon={Truck}
            color="from-blue-500 to-indigo-600"
            trend={8}
            subtitle="Excelente ritmo!"
            onClick={() => window.location.assign('/delivery/entregas')}
          />
          <ModernStatCard
            title="Avaliação Média"
            value={avgRating.toFixed(1)}
            icon={Star}
            color="from-yellow-500 to-orange-500"
            subtitle="Muito bom!"
            onClick={() => window.location.assign('/delivery/avaliacoes')}
          />
          <ModernStatCard
            title="Total Entregas"
            value={totalDeliveries}
            icon={Award}
            color="from-purple-500 to-pink-500"
            subtitle="desde o início"
            onClick={() => window.location.assign('/delivery/entregas')}
          />
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Performance */}
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
                  <PerformanceRing percentage={goalProgress} label="Meta Diária" color="#10b981" />
                  <PerformanceRing percentage={ratingProgress} label="Satisfação" color="#f59e0b" />
                  <PerformanceRing percentage={efficiencyProgress} label="Eficiência" color="#3b82f6" />
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tempo Online Hoje</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.floor((onlineMinutes || 0) / 60)}h {(onlineMinutes || 0) % 60}min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Status</p>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                          isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                        {isAvailable ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pedidos ativos */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Pedidos Ativos</h2>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-3 py-1 rounded-full font-bold">
                {dashboardStats?.activeOrders?.length || 0}
              </div>
            </div>

            {dashboardStats?.activeOrders?.length ? (
              <div className="space-y-4">
                {dashboardStats.activeOrders.map((order) => (
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
                  {isAvailable ? 'Aguardando novos pedidos chegarem...' : 'Fique online para receber pedidos'}
                </p>
                {!isAvailable && (
                  <button
                    onClick={toggleAvailability}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
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
