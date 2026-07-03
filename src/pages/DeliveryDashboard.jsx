// src/pages/DeliveryDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import DeliveryService from '../services/deliveryService';
import { acceptDelivery, completeDelivery } from '../services/orderService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, Truck, Star, Wifi, WifiOff, MapPin, Calendar, Bell,
  Target, Award, Activity, RefreshCw, ExternalLink, Phone, Navigation,
  KeyRound, Zap, CheckCircle, TrendingUp, Package,
} from 'lucide-react';

import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { DeliverySkeleton } from '../components/skeletons/DeliverySkeleton';
import { supabase } from '../lib/supabase';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';
import { haptics } from '../lib/haptics';

// ─── helpers ─────────────────────────────────────────────────────────────────
const toNumber = (v) => (typeof v === 'number' ? v : parseFloat(v || '0')) || 0;

const useDebouncedCallback = (fn, delay = 600) => {
  const timer = useRef(null);
  return useCallback((...args) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
};

// ─── AnimatedNumber ───────────────────────────────────────────────────────────
const AnimatedNumber = memo(({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const diff = end - start;
    if (!diff) return;
    const duration = 900;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - elapsed, 3);
      setDisplayed(start + diff * ease);
      if (elapsed < 1) requestAnimationFrame(tick);
      else prevRef.current = end;
    };
    requestAnimationFrame(tick);
  }, [value]);

  const formatted = decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed);
  return <span>{prefix}{formatted}{suffix}</span>;
});

// ─── PulsingBadge ─────────────────────────────────────────────────────────────
const PulsingBadge = memo(({ count }) => {
  if (!count) return null;
  return (
    <div className="relative inline-flex">
      <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
      <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white text-xs font-black shadow-lg">
        {count > 9 ? '9+' : count}
      </span>
    </div>
  );
});

// ─── ModernStatCard ───────────────────────────────────────────────────────────
const ModernStatCard = memo(({ title, value, icon: Icon, color, trend, subtitle, onClick }) => (
  <Card
    className={`relative overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br ${color} border-0`}
    onClick={onClick}
  >
    <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
      <Icon className="w-full h-full" />
    </div>
    <CardContent className="p-4 sm:p-6 relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
        {typeof trend === 'number' && (
          <div className="flex items-center text-white/80 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />+{trend}%
          </div>
        )}
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-white mb-1 break-words" style={{ textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
        {value}
      </div>
      <div className="text-white/80 text-sm font-medium">{title}</div>
      {subtitle && <div className="text-white/60 text-xs mt-1">{subtitle}</div>}
    </CardContent>
  </Card>
));

// ─── PerformanceRing ──────────────────────────────────────────────────────────
const PerformanceRing = memo(({ percentage, label, color }) => {
  const p = Math.max(0, Math.min(100, percentage || 0));
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(p * circumference) / 100} ${circumference}`;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16 sm:w-24 sm:h-24">
        <svg className="w-16 h-16 sm:w-24 sm:h-24 transform -rotate-90" viewBox="0 0 100 100" aria-label={label}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={strokeDasharray} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm sm:text-xl font-bold text-gray-800">{Math.round(p)}%</span>
        </div>
      </div>
      <span className="text-xs sm:text-sm text-gray-600 mt-2 text-center">{label}</span>
    </div>
  );
});

// ─── ModernActiveOrderCard ────────────────────────────────────────────────────
const ModernActiveOrderCard = memo(({ order, onAcceptOrder, onCompleteOrder, isNew }) => {
  const status = order?.status;

  const badge = useMemo(() => {
    const map = {
      pending:             { t: 'Disponível',         cls: 'bg-yellow-500' },
      accepted:            { t: 'Aceito',              cls: 'bg-blue-500' },
      ready:               { t: 'Pronto p/ retirada',  cls: 'bg-purple-500' },
      accepted_by_delivery:{ t: 'Aguardando Retirada', cls: 'bg-fuchsia-600' },
      delivering:          { t: 'Entregando',          cls: 'bg-green-600' },
      delivered:           { t: 'Entregue',            cls: 'bg-gray-500' },
    };
    return map[status] || { t: status || '—', cls: 'bg-gray-500' };
  }, [status]);

  const showPickup = status === 'accepted_by_delivery' && order?.pickup_code;

  return (
    <Card
      className={`relative overflow-hidden border-0 shadow-xl bg-white/90 backdrop-blur-sm transition-all duration-500
        ${isNew ? 'animate-[slideInRight_0.4s_ease-out]' : ''}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-800">#{order?.id?.substring(0, 8) || 'N/A'}</h3>
            <div className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${badge.cls}`}>{badge.t}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              R$ {toNumber(order?.delivery_fee).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Taxa de entrega</p>
          </div>
        </div>

        {showPickup && (
          <div className="mb-4 p-4 rounded-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-purple-600 p-2 rounded-full"><KeyRound className="h-4 w-4 text-white" /></div>
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
            <div className="p-2 bg-orange-100 rounded-lg"><ExternalLink className="h-4 w-4 text-orange-600" /></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{order.restaurant_name || 'Restaurante'}</p>
              <p className="text-sm text-gray-600">Local de coleta</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg"><MapPin className="h-4 w-4 text-green-600" /></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{order.client_name || 'Cliente'}</p>
              <p className="text-sm text-gray-600 truncate">{order.delivery_address || 'Endereço de entrega'}</p>
            </div>
            <Phone className="h-4 w-4 text-gray-400" />
          </div>

          {/* Payment info */}
          {order.payment_method === 'cash' ? (
            <div className="p-3 rounded-xl border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50">
              <p className="text-sm font-black text-orange-700 flex items-center gap-2">
                💵 COBRAR{' '}
                <span className="text-base">R$ {toNumber(order.total_amount).toFixed(2)}</span>
                {' '}EM DINHEIRO
              </p>
              {toNumber(order.change_for) > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  Levar troco de R$ {(toNumber(order.change_for) - toNumber(order.total_amount)).toFixed(2)}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <span className="text-green-600 text-sm font-semibold">✅ Pago online</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {status === 'pending' && (
              <button
                onClick={() => onAcceptOrder(order.id)}
                className="flex-1 min-h-[44px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Zap className="h-4 w-4" /> Aceitar Pedido
              </button>
            )}

            {(status === 'accepted' || status === 'ready' || status === 'accepted_by_delivery' || status === 'delivering') && (
              <button
                onClick={() => onCompleteOrder(order.id)}
                className="flex-1 min-h-[44px] bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                {status === 'delivering' ? 'Entreguei! 🎉' : 'Próximo Passo'}
              </button>
            )}

            {order.delivery_address && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address)}`}
                target="_blank" rel="noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" /> Rota
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function ModernDeliveryDashboard() {
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const addToast = useToast();
  const playSound = useNotificationSound();

  const [dashboardStats, setDashboardStats] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pendingCompleteId, setPendingCompleteId] = useState(null);
  const [pendingCompleteOrder, setPendingCompleteOrder] = useState(null);
  const [pendingCode, setPendingCode] = useState('');
  const [pendingCashConfirm, setPendingCashConfirm] = useState(null);
  const [cashConfirmResult, setCashConfirmResult] = useState(null);
  const [cashConfirmLoading, setCashConfirmLoading] = useState(false);
  const [availableCount, setAvailableCount] = useState(0);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const knownAvailableRef = useRef(null);

  const isAvailable = dashboardStats?.is_available || false;
  const activeOrders = dashboardStats?.activeOrders || [];

  // ── GPS tracking when online and delivering ────────────────────────────────
  useGPSTracking({ enabled: isAvailable && activeOrders.length > 0 });

  // ── Per-order location tracking (sends to /api/deliveries/:id/location) ───
  const trackingIntervalRef = useRef(null);
  const orderWatchIdRef = useRef(null);
  const trackedOrderIdRef = useRef(null);

  const sendOrderLocation = useCallback((latitude, longitude, orderId) => {
    fetch(`${DELIVERY_API_URL}/api/deliveries/${orderId}/location`, {
      method: 'PATCH',
      headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    }).catch(() => {}); // falha silenciosa
  }, []);

  useEffect(() => {
    const activeOrder = activeOrders.find(
      (o) => ['picked_up', 'on_the_way', 'delivering'].includes(o?.status)
    );
    const isTracking = !!activeOrder;
    const orderId = activeOrder?.id;

    // Stop tracking if order changed or no longer active
    if (trackedOrderIdRef.current && trackedOrderIdRef.current !== orderId) {
      if (orderWatchIdRef.current != null) {
        navigator.geolocation?.clearWatch(orderWatchIdRef.current);
        orderWatchIdRef.current = null;
      }
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      trackedOrderIdRef.current = null;
    }

    if (isTracking && orderId && orderWatchIdRef.current == null) {
      trackedOrderIdRef.current = orderId;

      // watchPosition: sends on movement
      orderWatchIdRef.current = navigator.geolocation?.watchPosition(
        (pos) => sendOrderLocation(pos.coords.latitude, pos.coords.longitude, orderId),
        (err) => console.warn('[OrderTracking] Geo error:', err),
        { enableHighAccuracy: true, maximumAge: 5000 }
      ) ?? null;

      // Interval fallback: guarantees a send every 10s even without movement
      trackingIntervalRef.current = setInterval(() => {
        navigator.geolocation?.getCurrentPosition(
          (pos) => sendOrderLocation(pos.coords.latitude, pos.coords.longitude, orderId),
          () => {}
        );
      }, 10000);
    }

    if (!isTracking) {
      if (orderWatchIdRef.current != null) {
        navigator.geolocation?.clearWatch(orderWatchIdRef.current);
        orderWatchIdRef.current = null;
      }
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      trackedOrderIdRef.current = null;
    }

    return () => {
      if (orderWatchIdRef.current != null) navigator.geolocation?.clearWatch(orderWatchIdRef.current);
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };
  }, [activeOrders, sendOrderLocation]);

  // ── Fetch dashboard ────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (profileLoading || !profile?.id) { setInitialLoading(false); return; }
    if (isBackground && dashboardStats) setBackgroundLoading(true);
    else if (!dashboardStats) setInitialLoading(true);

    setError('');
    try {
      const [statsData, availableData] = await Promise.all([
        DeliveryService.getDashboardStats(),
        DeliveryService.getAvailableDeliveries().catch(() => []),
      ]);

      const stats = statsData?.data || statsData || {};
      setDashboardStats(stats);
      setLastUpdated(new Date());
      if (typeof stats?.is_available === 'boolean') updateProfile({ is_available: stats.is_available });

      const available = Array.isArray(availableData) ? availableData : [];

      // Detect new available orders after first load
      if (knownAvailableRef.current !== null) {
        const newIds = available
          .map(o => o.id)
          .filter(id => !knownAvailableRef.current.has(id));
        if (newIds.length > 0) {
          playSound('new_order');
          addToast(`🛵 ${newIds.length === 1 ? 'Novo pedido disponível!' : `${newIds.length} novos pedidos!`}`, 'success');
          setNewOrderIds(prev => new Set([...prev, ...newIds]));
          setTimeout(() => setNewOrderIds(new Set()), 4000);
        }
      }
      knownAvailableRef.current = new Set(available.map(o => o.id));
      setAvailableCount(available.length);

    } catch (err) {
      const msg = err?.message || 'Não foi possível carregar as estatísticas.';
      if (!dashboardStats) setError(msg);
      addToast(msg, 'error');
    } finally {
      setInitialLoading(false);
      setBackgroundLoading(false);
    }
  }, [profileLoading, profile?.id, dashboardStats, updateProfile, addToast, playSound]);

  // ── Para o loading quando o perfil termina de carregar sem ID (ex: não autenticado) ──
  useEffect(() => {
    if (!profileLoading && !profile?.id) {
      setInitialLoading(false);
    }
  }, [profileLoading, profile?.id]);

  // ── Polling + visibility ───────────────────────────────────────────────────
  useEffect(() => {
    if (profileLoading || !profile?.id) return;
    let intervalId;
    const start = () => { intervalId = window.setInterval(() => fetchDashboardData(true), 30000); };
    const stop = () => intervalId && window.clearInterval(intervalId);

    fetchDashboardData(false);
    start();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { fetchDashboardData(true); start(); }
      else stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [profileLoading, profile?.id, fetchDashboardData]);

  // ── Supabase realtime for new available orders ─────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const ch = supabase
      .channel('delivery-available-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.new?.status === 'ready' && !payload.new?.delivery_id) {
          playSound('new_order');
          addToast('🛵 Novo pedido disponível!', 'success');
          fetchDashboardData(true);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [playSound, addToast, fetchDashboardData]);

  const debouncedRefresh = useDebouncedCallback(() => fetchDashboardData(true), 700);

  const { pulling, refreshing } = usePullToRefresh(() => fetchDashboardData(true));

  // ── Toggle availability ────────────────────────────────────────────────────
  const toggleAvailability = async () => {
    if (!profile || profileLoading) return addToast('Perfil não carregado.', 'warning');
    haptics.tap();
    try {
      const next = !isAvailable;
      const updated = await DeliveryService.updateDeliveryProfile({ is_available: next });
      updateProfile({ is_available: !!updated?.is_available });
      setDashboardStats((p) => ({ ...(p || {}), is_available: !!updated?.is_available }));
      haptics.success();
      addToast(`Agora você está ${next ? 'ONLINE 🟢' : 'OFFLINE 🔴'}!`, 'success');
    } catch {
      haptics.error();
      addToast('Erro ao atualizar disponibilidade.', 'error');
    }
  };

  const handleAcceptOrder = async (orderId) => {
    haptics.tap();
    try {
      await acceptDelivery(orderId);
      playSound('accepted');
      haptics.success();
      addToast('Pedido aceito com sucesso! 🎉', 'success');
      fetchDashboardData(true);
    } catch {
      haptics.error();
      addToast('Erro ao aceitar pedido.', 'error');
    }
  };

  const handleCompleteOrder = (orderId) => {
    const order = activeOrders.find(o => o.id === orderId) || null;
    setPendingCompleteId(orderId);
    setPendingCompleteOrder(order);
    setPendingCode('');
  };

  const confirmComplete = async () => {
    const deliveryCode = String(pendingCode).trim().toUpperCase();
    if (deliveryCode.length < 3) { haptics.warn(); addToast('Código inválido.', 'warning'); return; }
    try {
      await completeDelivery(pendingCompleteId, deliveryCode);
      playSound('delivered');
      haptics.notify();
      addToast('Pedido entregue com sucesso! 🎉', 'success');

      if (pendingCompleteOrder?.payment_method === 'cash') {
        setPendingCashConfirm(pendingCompleteOrder);
        setCashConfirmResult(null);
      }

      setPendingCompleteId(null);
      setPendingCompleteOrder(null);
      setPendingCode('');
      fetchDashboardData(true);
    } catch (err) {
      addToast(err?.message || 'Erro ao completar entrega.', 'error');
    }
  };

  const handleCashConfirm = async () => {
    if (!pendingCashConfirm) return;
    setCashConfirmLoading(true);
    try {
      const result = await DeliveryService.confirmCashPayment(pendingCashConfirm.id);
      setCashConfirmResult(result);
      fetchDashboardData(true);
    } catch (err) {
      addToast(err?.message || 'Erro ao confirmar recebimento.', 'error');
    } finally {
      setCashConfirmLoading(false);
    }
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen animate-pulse">
        <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3 mb-6" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl" />)}
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
          <button onClick={() => fetchDashboardData(false)}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl">
            Tentar Novamente
          </button>
        </Card>
      </div>
    );
  }

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
      {(pulling || refreshing) && (
        <div className="flex justify-center py-3">
          <div className="w-6 h-6 border-2 border-[#FF6F00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* Top progress bar */}
      {backgroundLoading && <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-red-400 animate-pulse fixed top-0 z-50" />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white/70 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent break-words">
                Olá, {profile?.first_name || 'Entregador'}! 👋
              </h1>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <p className="text-gray-600 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                {lastUpdated && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Activity className={`h-3 w-3 ${backgroundLoading ? 'animate-pulse' : ''}`} />
                    {lastUpdated.toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              {/* Available orders badge */}
              {availableCount > 0 && (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-700">Disponíveis</span>
                  <PulsingBadge count={availableCount} />
                </div>
              )}

              <button
                onClick={debouncedRefresh}
                className="p-2 sm:p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                disabled={backgroundLoading}
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${backgroundLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* ONLINE/OFFLINE big toggle */}
              <button
                onClick={toggleAvailability}
                className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-white font-black text-sm flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[44px] ${
                  isAvailable
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                }`}
              >
                <div className={`w-3 h-3 rounded-full bg-white ${isAvailable ? 'animate-pulse' : 'opacity-50'}`} />
                {isAvailable ? (
                  <><Wifi className="h-4 w-4 sm:h-5 sm:w-5" /> ONLINE</>
                ) : (
                  <><WifiOff className="h-4 w-4 sm:h-5 sm:w-5" /> OFFLINE</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* ── Dinheiro em mãos ────────────────────────────────────────────── */}
        {(toNumber(dashboardStats?.cashDebt) > 0 || toNumber(dashboardStats?.totalCashReceived) > 0) && (
          <div className="mb-6 p-5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl text-white shadow-xl">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2">💵 Dinheiro em mãos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/80 mb-0.5">Recebido hoje</p>
                <p className="text-2xl font-black">R$ {toNumber(dashboardStats?.totalCashReceived).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-white/80 mb-0.5">Débito com plataforma</p>
                <p className="text-2xl font-black">R$ {toNumber(dashboardStats?.cashDebt).toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-white/70 mt-3">
              O débito será descontado dos seus próximos repasses online.
            </p>
          </div>
        )}

        {/* ── Stats Grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-6 sm:mb-8">
          <ModernStatCard
            title="Ganhos Hoje"
            value={<AnimatedNumber value={todayEarnings} prefix="R$ " decimals={2} />}
            icon={DollarSign}
            color="from-green-500 to-emerald-600"
            subtitle={`Meta: R$ ${dailyGoal.toFixed(2)}`}
            onClick={() => window.location.assign('/delivery/ganhos')}
          />
          <ModernStatCard
            title="Entregas Hoje"
            value={<AnimatedNumber value={todayDeliveries} />}
            icon={Truck}
            color="from-blue-500 to-indigo-600"
            subtitle="Continue assim!"
            onClick={() => window.location.assign('/delivery/entregas')}
          />
          <ModernStatCard
            title="Avaliação Média"
            value={<AnimatedNumber value={avgRating} decimals={1} suffix="★" />}
            icon={Star}
            color="from-yellow-500 to-orange-500"
            subtitle="Muito bom!"
            onClick={() => window.location.assign('/delivery/avaliacoes')}
          />
          <ModernStatCard
            title="Total Entregas"
            value={<AnimatedNumber value={totalDeliveries} />}
            icon={Award}
            color="from-purple-500 to-pink-500"
            subtitle="desde o início"
            onClick={() => window.location.assign('/delivery/entregas')}
          />
        </div>

        {/* ── Performance + Active Orders ─────────────────────────────────── */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Performance rings */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" /> Performance de Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:gap-8 mb-6">
                  <PerformanceRing percentage={goalProgress} label="Meta Diária" color="#10b981" />
                  <PerformanceRing percentage={ratingProgress} label="Satisfação" color="#f59e0b" />
                  <PerformanceRing percentage={efficiencyProgress} label="Eficiência" color="#3b82f6" />
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 sm:p-4 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Tempo Online Hoje</p>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600">
                        {Math.floor(onlineMinutes / 60)}h {onlineMinutes % 60}min
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs sm:text-sm text-gray-600">Status</p>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                        isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {isAvailable ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active orders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Pedidos Ativos</h2>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-3 py-1 rounded-full font-bold">
                {activeOrders.length}
              </div>
            </div>

            {backgroundLoading && activeOrders.length === 0 ? (
              <DeliverySkeleton count={2} />
            ) : activeOrders.length ? (
              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <ModernActiveOrderCard
                    key={order.id}
                    order={order}
                    isNew={newOrderIds.has(order.id)}
                    onAcceptOrder={handleAcceptOrder}
                    onCompleteOrder={handleCompleteOrder}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Tudo tranquilo!</h3>
                <p className="text-gray-600 mb-4">
                  {isAvailable
                    ? availableCount > 0
                      ? `${availableCount} pedido${availableCount > 1 ? 's' : ''} disponível${availableCount > 1 ? 'is' : ''} para aceitar`
                      : 'Aguardando novos pedidos...'
                    : 'Fique online para receber pedidos'}
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

      {/* ── Cash payment confirmation modal ───────────────────────────────── */}
      {pendingCashConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 max-h-[90vh] overflow-y-auto mx-0 sm:mx-4">
            {cashConfirmResult ? (
              <div className="text-center">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Pagamento Registrado!</h3>
                <div className="space-y-2 text-left bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Você recebeu</span>
                    <span className="font-bold text-green-600">R$ {toNumber(cashConfirmResult.voce_recebeu).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Sua taxa de entrega</span>
                    <span className="font-bold text-blue-600">R$ {toNumber(cashConfirmResult.sua_taxa).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-gray-600">Débito com plataforma</span>
                    <span className="font-bold text-orange-600">R$ {toNumber(cashConfirmResult.deve_a_plataforma).toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  R$ {toNumber(cashConfirmResult.deve_a_plataforma).toFixed(2)} será descontado do seu próximo repasse online.
                </p>
                <button
                  onClick={() => { setPendingCashConfirm(null); setCashConfirmResult(null); }}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors"
                >
                  Entendido!
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-5">
                  <div className="text-5xl mb-2">💵</div>
                  <h3 className="text-lg font-bold text-gray-800">Confirmar Recebimento</h3>
                  <p className="text-sm text-gray-500 mt-1">Este era um pedido em dinheiro</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 text-center">
                  <p className="text-3xl font-black text-orange-700">
                    R$ {toNumber(pendingCashConfirm.total_amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-orange-600 mt-1">Você já recebeu este valor do cliente?</p>
                  {toNumber(pendingCashConfirm.change_for) > 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                      Troco levado: R$ {(toNumber(pendingCashConfirm.change_for) - toNumber(pendingCashConfirm.total_amount)).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingCashConfirm(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Não agora
                  </button>
                  <button
                    onClick={handleCashConfirm}
                    disabled={cashConfirmLoading}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {cashConfirmLoading
                      ? <RefreshCw className="h-4 w-4 animate-spin" />
                      : '✅ Sim, confirmar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delivery code modal ────────────────────────────────────────────── */}
      {pendingCompleteId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 mx-0 sm:mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-orange-500" />
              Código de Entrega
            </h3>
            <p className="text-sm text-gray-500 mb-4">Peça o código de 4 letras ao cliente para confirmar a entrega.</p>
            <input
              type="text"
              value={pendingCode}
              onChange={e => setPendingCode(e.target.value.toUpperCase())}
              placeholder="Ex: ABCD"
              maxLength={6}
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-base sm:text-xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
              onKeyDown={e => { if (e.key === 'Enter') confirmComplete(); }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setPendingCompleteId(null); setPendingCode(''); }}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmComplete}
                disabled={pendingCode.trim().length < 3}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
