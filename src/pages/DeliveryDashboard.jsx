// src/pages/DeliveryDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryService from '../services/deliveryService';
import { acceptDelivery, completeDelivery, getOrdersToReview } from '../services/orderService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, Truck, Star, Wifi, WifiOff, MapPin, Calendar, Bell,
  Target, Award, Activity, RefreshCw, ExternalLink, Phone, Navigation,
  KeyRound, Zap, CheckCircle, TrendingUp, Package,
} from 'lucide-react';

import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PainelDoDia from '../components/PainelDoDia';
import { DeliverySkeleton } from '../components/skeletons/DeliverySkeleton';
import SocialDayBanner from '../components/SocialDayBanner';
import PostDeliveryRating from '../components/PostDeliveryRating.jsx';
import { supabase } from '../lib/supabase';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';
import { haptics } from '../lib/haptics';
import { getPageCache, setPageCache } from '../lib/pageCache.js';
import { numeroPedido } from '../utils/pedidoNumero';

const DASHBOARD_CACHE_KEY = 'delivery:dashboard';

// ─── helpers ─────────────────────────────────────────────────────────────────
const toNumber = (v) => (typeof v === 'number' ? v : parseFloat(v || '0')) || 0;

const useDebouncedCallback = (fn, delay = 600) => {
  const timer = useRef(null);
  return useCallback((...args) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
};

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

// ─── ModernActiveOrderCard ────────────────────────────────────────────────────
const ModernActiveOrderCard = memo(({ order, onAcceptOrder, onCompleteOrder, isNew, isAccepting }) => {
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

  // O entregador vê o LÍQUIDO (frete menos a taxa da plataforma), não o frete
  // bruto — senão vira o susto do Gabriel ("dizia 5, caiu 4,80").
  const fee = toNumber(order?.delivery_fee);
  const net = toNumber(order?.valor_repassado_entregador);
  const showNet = net > 0;
  const feePct = showNet && fee > net ? Math.round((1 - net / fee) * 100) : 0;

  // Rota até o RESTAURANTE (retirada) — o botão Rota de baixo leva ao cliente.
  const restaurantAddress = [
    order?.restaurant_name, order?.restaurant_street, order?.restaurant_number,
    order?.restaurant_neighborhood, order?.restaurant_city,
  ].filter(Boolean).join(', ');
  const restaurantMapsUrl = restaurantAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurantAddress)}`
    : null;

  return (
    <Card
      className={`relative overflow-hidden border-0 shadow-xl bg-white/90 backdrop-blur-sm transition-all duration-500
        ${isNew ? 'animate-[slideInRight_0.4s_ease-out]' : ''}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-800">{numeroPedido(order)}</h3>
            <div className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${badge.cls}`}>{badge.t}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              R$ {(showNet ? net : fee).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">{showNet ? 'Você recebe' : 'Taxa de entrega'}</p>
            {showNet && feePct > 0 && (
              <p className="text-[11px] text-gray-400 leading-tight">
                Frete R$ {fee.toFixed(2)} · taxa {feePct}%
              </p>
            )}
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
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{order.restaurant_name || 'Restaurante'}</p>
              <p className="text-sm text-gray-600">Local de coleta</p>
            </div>
            {restaurantMapsUrl && (
              <a
                href={restaurantMapsUrl}
                target="_blank" rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs font-semibold text-orange-700 hover:bg-orange-100"
              >
                <Navigation className="h-4 w-4" /> Rota
              </a>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg shrink-0"><MapPin className="h-4 w-4 text-green-600" /></div>
            {/* min-w-0: sem isto o flex-1 não deixa o truncate agir e o
                endereço longo estourava/cortava na borda da tela. */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{order.client_name || 'Cliente'}</p>
              <p className="text-sm text-gray-600 truncate">{order.delivery_address || 'Endereço de entrega'}</p>
            </div>
            <Phone className="h-4 w-4 text-gray-400 shrink-0" />
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

          {/* Botões empilham no mobile (cada um largura cheia) e ficam lado a
              lado no sm+. Antes, "Entreguei" (flex-1) + "Rota" na mesma linha
              estouravam a largura no celular e o "Rota" saía cortado. */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {status === 'pending' && (
              <button
                onClick={() => onAcceptOrder(order.id)}
                disabled={isAccepting}
                className="w-full sm:flex-1 min-w-0 min-h-[44px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isAccepting
                  ? (<><RefreshCw className="h-4 w-4 animate-spin" /> Aceitando…</>)
                  : (<><Zap className="h-4 w-4" /> Aceitar Pedido</>)}
              </button>
            )}

            {(status === 'accepted' || status === 'ready' || status === 'accepted_by_delivery' || status === 'delivering') && (
              <button
                onClick={() => onCompleteOrder(order.id)}
                className="w-full sm:flex-1 min-w-0 min-h-[44px] bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                {status === 'delivering' ? 'Confirmar entrega (código)' : 'Próximo passo'}
              </button>
            )}

            {order.delivery_address && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address)}`}
                target="_blank" rel="noreferrer"
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center gap-2"
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
  const navigate = useNavigate();
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const addToast = useToast();
  const playSound = useNotificationSound();

  // Mostra os últimos dados vistos na hora (sem tela de carregamento) se já
  // visitou essa tela antes na mesma sessão, atualizando por baixo.
  const dashboardCached = getPageCache(DASHBOARD_CACHE_KEY);
  const [dashboardStats, setDashboardStats] = useState(dashboardCached ?? null);
  const [initialLoading, setInitialLoading] = useState(!dashboardCached);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pendingCompleteId, setPendingCompleteId] = useState(null);
  const [pendingCompleteOrder, setPendingCompleteOrder] = useState(null);
  const [pendingCode, setPendingCode] = useState('');
  const [completing, setCompleting] = useState(false); // trava anti-duplo-clique no "Confirmar" do código
  const [pendingCashConfirm, setPendingCashConfirm] = useState(null);
  const [cashConfirmResult, setCashConfirmResult] = useState(null);
  const [cashConfirmLoading, setCashConfirmLoading] = useState(false);
  // Pedido recém-entregue esperando a avaliação do cliente (prompt "Avaliar /
  // deixar para depois" que aparece antes do pedido sumir da tela).
  const [pendingReviewOrder, setPendingReviewOrder] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [availableCount, setAvailableCount] = useState(0);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const knownAvailableRef = useRef(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const acceptingRef = useRef(false);

  const isAvailable = dashboardStats?.is_available || false;
  const activeOrders = dashboardStats?.activeOrders || [];

  // Cadastro mínimo pro entregador rodar sem quebrar o fluxo: contato + veículo
  // + PIX (sem chave PIX o repasse automático via PIX falha). Espelha o gate do
  // restaurante — só deixa ficar ONLINE depois de preencher.
  const cadastroPendente = useMemo(() => {
    const p = profile || {};
    const faltando = [];
    if (!String(p.first_name || '').trim()) faltando.push('nome');
    if (!String(p.phone || '').trim()) faltando.push('telefone');
    if (!String(p.cpf || '').trim()) faltando.push('CPF');
    // Endereço é obrigatório: sem ele o backend não consegue filtrar por raio
    // (e o entregador ficaria "online" sem receber pedido nenhum).
    if (!String(p.address_street || '').trim() || !String(p.address_city || '').trim())
      faltando.push('endereço');
    if (!String(p.vehicle_type || '').trim()) faltando.push('tipo de veículo');
    // Motorizado (moto/carro) exige placa E CNH — igual à trava do backend.
    const motorizado = ['moto', 'carro'].includes(p.vehicle_type);
    if (motorizado && !String(p.vehicle_plate || '').trim()) faltando.push('placa');
    if (motorizado && !String(p.cnh || '').trim()) faltando.push('CNH');
    if (!String(p.pix_key || '').trim()) faltando.push('chave PIX');
    return faltando;
  }, [profile]);

  // ── GPS tracking when online and delivering ────────────────────────────────
  useGPSTracking({ enabled: isAvailable && activeOrders.length > 0 });

  // Rastreamento por pedido — agora em hooks/useOrderTracking.js, dividido com
  // o MyDeliveriesPage. Estava só aqui, e como a entrega é acompanhada na OUTRA
  // tela, na prática nunca rodava durante a corrida.
  useOrderTracking(activeOrders);

  // ── Fetch dashboard ────────────────────────────────────────────────────────
  // Refs no lugar de estado nas dependências: com `dashboardStats` nas deps,
  // cada fetch recriava este callback → o efeito de polling re-rodava → fetch
  // imediato de novo → laço perpétuo (só a latência da rede segurava). Junto
  // com o updateProfile instável, era a enxurrada de GET/PUT dos logs do E2E.
  // Inicializa do cache: sem isto, cada vez que o entregador voltava pra tela
  // Início o fetch de mount setava initialLoading=true e mostrava o skeleton
  // inteiro de novo, mesmo já tendo os dados em cache (o "fica atualizando").
  const hasStatsRef = useRef(!!dashboardCached);
  const profileAvailRef = useRef(undefined);
  useEffect(() => { profileAvailRef.current = profile?.is_available; }, [profile?.is_available]);

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (profileLoading || !profile?.id) { setInitialLoading(false); return; }
    if (isBackground && hasStatsRef.current) setBackgroundLoading(true);
    else if (!hasStatsRef.current) setInitialLoading(true);

    setError('');
    try {
      const [statsData, availableData] = await Promise.all([
        DeliveryService.getDashboardStats(),
        DeliveryService.getAvailableDeliveries().catch(() => []),
      ]);

      const stats = statsData?.data || statsData || {};
      hasStatsRef.current = true;
      setDashboardStats(stats);
      setPageCache(DASHBOARD_CACHE_KEY, stats);
      setLastUpdated(new Date());
      // So PUT quando a disponibilidade realmente MUDOU — sincronizar um valor
      // igual gerava um PUT /delivery/profile por ciclo de polling, de graça.
      if (typeof stats?.is_available === 'boolean' && stats.is_available !== profileAvailRef.current) {
        updateProfile({ is_available: stats.is_available });
      }

      const available = Array.isArray(availableData) ? availableData : [];

      // Detect new available orders after first load
      if (knownAvailableRef.current !== null) {
        const newIds = available
          .map(o => o.id)
          .filter(id => !knownAvailableRef.current.has(id));
        if (newIds.length > 0) {
          // som fica por conta do alarme em loop (useEffect mais abaixo)
          addToast(`🛵 ${newIds.length === 1 ? 'Novo pedido disponível!' : `${newIds.length} novos pedidos!`}`, 'success');
          setNewOrderIds(prev => new Set([...prev, ...newIds]));
          setTimeout(() => setNewOrderIds(new Set()), 4000);
        }
      }
      knownAvailableRef.current = new Set(available.map(o => o.id));
      setAvailableCount(available.length);

    } catch (err) {
      const msg = err?.message || 'Não foi possível carregar as estatísticas.';
      if (!hasStatsRef.current) setError(msg);
      addToast(msg, 'error');
    } finally {
      setInitialLoading(false);
      setBackgroundLoading(false);
    }
    // dashboardStats fora das deps de propósito (via hasStatsRef): ele muda a
    // CADA fetch e recriar o callback aqui reinicia o efeito de polling.
  }, [profileLoading, profile?.id, updateProfile, addToast, playSound]);

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
    const start = () => { intervalId = window.setInterval(() => fetchDashboardData(true), 20000); };
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
  // ── Realtime do Supabase REMOVIDO (auditoria de 18/08/2026) ────────────────
  //
  // Havia aqui uma inscrição em postgres_changes que NUNCA entregou um evento
  // sequer. A política de RLS resolve o dono comparando auth.uid() com colunas
  // que apontam pro PERFIL, não pro usuário do auth — medido no banco:
  // client_profiles.id = user_id em 0 de 24, delivery_profiles em 0 de 6 (só
  // restaurant_profiles casa, 17 de 17). E nenhum app chama
  // supabase.auth.setSession: todos conectam como anon puro, então auth.uid()
  // é NULL e nenhuma política casa.
  //
  // Provado com a chave anon do pacote publicado:
  //   GET /rest/v1/orders  ->  0 linhas
  //   GET /rest/v1/chat_messages  ->  0 linhas
  //   GET /rest/v1/delivery_tracking  ->  0 linhas
  // Sem leitura não há evento: o canal conectava e ficava mudo.
  //
  // Isso está CERTO em segurança (nenhum anônimo lê pedido ou conversa alheia).
  // O problema era o canal existir e PARECER que funcionava — em 18/08 essa
  // aparência me levou a afrouxar o polling de 6s pra 20s "porque o realtime
  // cobre". Não cobria.
  //
  // O que ele prometia já vem por dois caminhos que funcionam: o POLLING desta
  // mesma tela (app aberto) e o PUSH do FCM (app em segundo plano).
  //
  // PRA RESSUSCITAR seriam DUAS coisas, nesta ordem: (1) os apps abrirem sessão
  // no Supabase com setSession e (2) reescrever as políticas pra resolver o
  // perfil (client_id IN (SELECT id FROM client_profiles WHERE user_id =
  // auth.uid())). Mexer só numa das duas não liga nada.


  // Alarme sonoro de novo pedido MOVIDO pro DeliveryPortalLayout (hook
  // useNewOrderAlarm): agora toca em QUALQUER tela enquanto online, não só aqui
  // no Início. Aqui ficaria mudo assim que o entregador trocasse de aba.

  const debouncedRefresh = useDebouncedCallback(() => fetchDashboardData(true), 700);

  const { pulling, refreshing } = usePullToRefresh(() => fetchDashboardData(true));

  // ── Toggle availability ────────────────────────────────────────────────────
  const toggleAvailability = async () => {
    if (!profile || profileLoading) return addToast('Perfil não carregado.', 'warning');
    // Gate: entregador precisa ser aprovado pelo admin antes de operar.
    if (!isAvailable && profile.approved === false) {
      haptics.warn();
      addToast('Seu cadastro está em análise pelo Inksa. Você poderá ficar online assim que for aprovado.', 'warning');
      return;
    }
    // Gate: não deixa ficar ONLINE sem o cadastro mínimo — senão entra pedido
    // sem como pagar (PIX) nem contatar o entregador em produção.
    if (!isAvailable && cadastroPendente.length > 0) {
      haptics.warn();
      addToast(`Complete seu cadastro para ficar online: ${cadastroPendente.join(', ')}.`, 'warning');
      navigate('/delivery/meu-perfil');
      return;
    }
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
    if (acceptingRef.current) return;          // trava o duplo clique
    acceptingRef.current = true;
    setAcceptingId(orderId);
    haptics.tap();
    try {
      await acceptDelivery(orderId);
      playSound('accepted');
      haptics.success();
      addToast('Pedido aceito com sucesso! 🎉', 'success');
      await fetchDashboardData(true);
    } catch {
      haptics.error();
      addToast('Erro ao aceitar pedido.', 'error');
    } finally {
      acceptingRef.current = false;
      setAcceptingId(null);
    }
  };

  const handleCompleteOrder = (orderId) => {
    const order = activeOrders.find(o => o.id === orderId) || null;
    setPendingCompleteId(orderId);
    setPendingCompleteOrder(order);
    setPendingCode('');
  };

  // Abre o prompt de avaliação pós-entrega (restaurante + cliente). Basta ter UM
  // dos dois pra valer a pena abrir: antes exigia client_id e, quando o pedido
  // vinha sem esse campo, a avaliação simplesmente não aparecia — o entregador
  // terminava a entrega e nada acontecia.
  const openClientReview = (order) => {
    if (!order || (!order.client_id && !order.restaurant_id)) return;
    setPendingReviewOrder(order);
    setShowReviewForm(false);
  };

  // Fecha o modal de dinheiro e, em seguida, oferece avaliar o cliente daquele
  // pedido — mantém a sequência entrega → dinheiro → avaliação.
  const closeCashConfirm = () => {
    const order = pendingCashConfirm;
    setPendingCashConfirm(null);
    setCashConfirmResult(null);
    openClientReview(order);
  };

  const confirmComplete = async () => {
    if (completing) return; // já está confirmando — ignora cliques repetidos
    const deliveryCode = String(pendingCode).replace(/\D/g, '');
    if (deliveryCode.length !== 6) { haptics.warn(); addToast('O código tem 6 números.', 'warning'); return; }
    setCompleting(true);
    try {
      await completeDelivery(pendingCompleteId, deliveryCode);
      playSound('delivered');
      haptics.notify();
      addToast('Pedido entregue com sucesso! 🎉', 'success');

      // Resolve o pedido a avaliar pela MESMA fonte da Central de Avaliações
      // (/pending-delivery-review). Antes dependíamos só do objeto em memória —
      // se ele se perdesse no refetch, o modal não abria e o entregador tinha
      // que ir na Central. Agora, se aparece na Central, aparece aqui.
      const local = pendingCompleteOrder
        || activeOrders.find(o => o.id === pendingCompleteId)
        || null;
      let completed = local;
      try {
        const pendentes = await getOrdersToReview();
        const achado = pendentes.find(o => String(o.id) === String(pendingCompleteId));
        if (achado) completed = { ...achado, payment_method: local?.payment_method, change_for: local?.change_for, total_amount: achado.total_amount ?? local?.total_amount };
      } catch {
        /* rede fora: segue com o objeto local */
      }
      if (completed?.payment_method === 'cash') {
        // Dinheiro: confirma o recebimento primeiro; a avaliação abre depois
        // que esse modal fechar (ver handlers do modal de dinheiro).
        setPendingCashConfirm(completed);
        setCashConfirmResult(null);
      } else {
        // Cartão/PIX: já oferece avaliar antes do pedido sumir da lista.
        openClientReview(completed);
      }

      setPendingCompleteId(null);
      setPendingCompleteOrder(null);
      setPendingCode('');
      fetchDashboardData(true);
    } catch (err) {
      addToast(err?.message || 'Erro ao completar entrega.', 'error');
    } finally {
      setCompleting(false);
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
  // Dados que o backend JÁ calculava e nenhuma tela mostrava.
  const weeklyEarnings = dashboardStats?.weeklyEarnings || [];
  const distanceToday = toNumber(dashboardStats?.distanceToday);
  const nextPayment = dashboardStats?.nextPayment || null;

  // Seção de pedidos ativos extraída pra ser reusada em dois lugares: no topo
  // no mobile (o entregador precisa do pedido + Rota sem rolar) e na coluna da
  // direita no desktop.
  const activeOrdersSection = (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Pedidos Ativos</h2>
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-3 py-1 rounded-full font-bold">
          {activeOrders.length}
        </div>
      </div>

      {backgroundLoading && activeOrders.length === 0 ? (
        <DeliverySkeleton count={2} />
      ) : activeOrders.length ? (
        // A gestão da entrega ativa (código de retirada, rota, cobrar, confirmar
        // entrega) vive SÓ na aba Entregas agora — aqui na Início fica só um
        // atalho, pra não duplicar o card inteiro em duas telas.
        <Card className="p-6 text-center shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <div className="text-4xl mb-3">🛵</div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            {activeOrders.length > 1
              ? `${activeOrders.length} entregas em andamento`
              : 'Você tem uma entrega em andamento'}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Abra a aba <span className="font-semibold">Entregas</span> para ver rota, código e confirmar a entrega.
          </p>
          <button
            onClick={() => navigate('/delivery/entregas')}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg inline-flex items-center gap-2"
          >
            <Package className="h-4 w-4" /> Abrir em Entregas
          </button>
        </Card>
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
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Dia I — Inksa Social (só aparece quando habilitado no admin) */}
      <SocialDayBanner />
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
        {/* ── Cadastro em análise: admin ainda não aprovou (não recebe pedidos) ── */}
        {!profileLoading && profile?.approved === false && (
          <div className="mb-6 p-4 rounded-2xl border border-yellow-200 bg-yellow-50 flex items-start gap-3">
            <div className="text-2xl leading-none">⏳</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-yellow-800">Cadastro em análise</p>
              <p className="text-sm text-yellow-700 mt-0.5">
                O Inksa está revisando seu cadastro. Assim que for aprovado, você poderá ficar online e receber pedidos. Aproveite pra deixar seus dados completos.
              </p>
            </div>
          </div>
        )}

        {/* ── Convite pra pôr foto ─────────────────────────────────────────
            NÃO TRAVA NADA. É o contrário dos dois avisos acima: aqueles são
            impedimentos (sem eles o entregador não recebe pedido); este é só
            um convite, e some sozinho no instante em que a foto existe.

            Por isso não tem botão de fechar. Aviso que se fecha e some pra
            sempre não seria informativo, seria descartável — e a única forma
            de sumir com ele é fazer a coisa, que leva vinte segundos e é boa
            pra quem faz.

            O TEXTO FALA DO GANHO DELE, não do nosso. O cliente reconhecer
            quem está chegando poupa a ligação de "sou eu na porta" e a
            desconfiança de abrir pra estranho. Pedir foto "pra plataforma
            ficar mais profissional" seria pedir favor; assim é oferecer
            vantagem — que é o que de fato é.

            Só aparece pra quem já passou do cadastro obrigatório: empilhar
            este convite embaixo de "complete seu cadastro" seria transformar
            duas coisas de pesos diferentes numa lista de tarefas só. */}
        {!profileLoading && cadastroPendente.length === 0 && !profile?.avatar_url && (
          <div className="mb-6 p-4 rounded-2xl border border-blue-200 bg-blue-50 flex items-start gap-3">
            <div className="text-2xl leading-none">📸</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-blue-900">Coloque uma foto no seu perfil</p>
              <p className="text-sm text-blue-800/90 mt-0.5">
                O cliente vê quem está levando o pedido dele. Com foto, ele te reconhece
                na porta — menos ligação de "sou eu que cheguei" e menos gente
                desconfiada de abrir. Leva vinte segundos.
              </p>
              <button
                onClick={() => navigate('/delivery/meu-perfil')}
                className="mt-2 text-sm font-semibold text-blue-900 underline underline-offset-2"
              >
                Adicionar foto →
              </button>
            </div>
          </div>
        )}

        {/* ── Cadastro incompleto: bloqueia ficar online (igual restaurante) ── */}
        {!profileLoading && cadastroPendente.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50 flex items-start gap-3">
            <div className="text-2xl leading-none">📋</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-800">Complete seu cadastro para começar</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Falta: {cadastroPendente.join(', ')}. Você só fica online depois de preencher.
              </p>
              <button
                onClick={() => navigate('/delivery/meu-perfil')}
                className="mt-2 text-sm font-semibold text-amber-800 underline underline-offset-2"
              >
                Completar cadastro →
              </button>
            </div>
          </div>
        )}

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
            <button
              onClick={() => navigate('/delivery/pagamento-dinheiro')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white underline underline-offset-2"
            >
              Entenda como funciona o pagamento em dinheiro →
            </button>
          </div>
        )}

        {/* Pedido ativo NO TOPO no mobile: o entregador precisa do pedido e do
            botão Rota na mão, sem rolar por baixo de stats/performance. No
            desktop (lg+) ele segue na coluna da direita, mais abaixo. */}
        {activeOrders.length > 0 && (
          <div className="lg:hidden mb-6">
            {activeOrdersSection}
          </div>
        )}

        {/* ── Painel do dia ───────────────────────────────────────────────
            Trocou os 4 cartões de gradiente + os anéis de performance. O
            porquê de cada escolha está em components/PainelDoDia.jsx. */}
        <PainelDoDia
          ganhosHoje={todayEarnings}
          meta={dailyGoal}
          entregasHoje={todayDeliveries}
          minutosOnline={onlineMinutes}
          distanciaHoje={distanceToday}
          avaliacao={avgRating}
          totalEntregas={totalDeliveries}
          semana={weeklyEarnings}
          proximoPagamento={nextPayment}
        />

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 hidden lg:block" />
          <div className={activeOrders.length > 0 ? 'hidden lg:block' : ''}>
            {activeOrdersSection}
          </div>
        </div>
      </div>

      {/* ── Cash payment confirmation modal ───────────────────────────────── */}
      {pendingCashConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 max-h-[90vh] overflow-y-auto mx-0 sm:mx-4" data-sem-pull style={{ paddingBottom: '1.5rem' }}>
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
                  onClick={closeCashConfirm}
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
                    onClick={closeCashConfirm}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 mx-0 sm:mx-4" style={{ paddingBottom: '1.5rem' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-orange-500" />
              Código de Entrega
            </h3>
            <p className="text-sm text-gray-500 mb-4">Peça o código de 6 números ao cliente para confirmar a entrega.</p>
            <input
              type="text"
              value={pendingCode}
              onChange={e => setPendingCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Ex: 480315"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-base sm:text-xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
              onKeyDown={e => { if (e.key === 'Enter') confirmComplete(); }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setPendingCompleteId(null); setPendingCode(''); }}
                disabled={completing}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmComplete}
                disabled={completing || pendingCode.trim().length !== 6}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {completing ? (<><RefreshCw className="h-4 w-4 animate-spin" /> Confirmando...</>) : (<><CheckCircle className="h-4 w-4" /> Confirmar</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Avaliar cliente após entrega ───────────────────────────────────────
          Aparece logo depois de confirmar a entrega (e do modal de dinheiro,
          quando for o caso), oferecendo avaliar o cliente ou deixar pra depois.
          "Deixar para depois" não perde nada: o pedido continua na lista de
          avaliações pendentes na Central de Avaliações. */}
      {pendingReviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 max-h-[90vh] overflow-y-auto mx-0 sm:mx-4" data-sem-pull style={{ paddingBottom: '1.5rem' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Star className="h-5 w-5 text-orange-500" /> Avalie esta entrega
              </h3>
              <button
                onClick={() => { setPendingReviewOrder(null); setShowReviewForm(false); }}
                className="text-sm font-semibold text-gray-400 hover:text-gray-600"
              >
                Depois
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Entrega concluída{pendingReviewOrder.client_name ? ` para ${pendingReviewOrder.client_name}` : ''}. Toque nas estrelas:
            </p>
            <PostDeliveryRating
              order={pendingReviewOrder}
              onDone={() => {
                addToast('Avaliação enviada! Obrigado 🙌', 'success');
                setPendingReviewOrder(null);
                setShowReviewForm(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
