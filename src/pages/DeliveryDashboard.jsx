// src/pages/DeliveryDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryService from '../services/deliveryService';

import { Card } from '@/components/ui/card';
import {
  Wifi, WifiOff, Calendar, Activity, RefreshCw, Package,
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
import { supabase } from '../lib/supabase';
import { haptics } from '../lib/haptics';
import { getPageCache, setPageCache } from '../lib/pageCache.js';
import { brl } from '../utils/dinheiro';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';

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

// O CARD DA ENTREGA ATIVA NÃO VIVE MAIS AQUI.
//
// Ele foi pra aba Entregas (MyDeliveriesPage) e, no Início, sobrou só um
// atalho que leva pra lá. O componente antigo ficou definido e NUNCA
// renderizado — 157 linhas que pareciam vivas.
//
// ⚠️ Isso não é cosmético: em 14/09/2026 eu consertei DUAS coisas aqui
// dentro (a navegação por coordenada e as etiquetas de status em português)
// achando que estava arrumando a tela do entregador. Nenhuma das duas
// chegava a rodar. Código morto que parece vivo não é sujeira — é armadilha.

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
  // Pedido recém-entregue esperando a avaliação do cliente (prompt "Avaliar /
  // deixar para depois" que aparece antes do pedido sumir da tela).
  const [availableCount, setAvailableCount] = useState(0);
  const knownAvailableRef = useRef(null);

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
          // O aviso do pedido novo é o toast + o alarme. Aqui havia também um
          // `newOrderIds` que marcava os cards novos por 4s — mas os cards de
          // pedido disponível não são desenhados nesta tela, então o estado era
          // alimentado e limpo sem ninguém nunca ler.
        }
      }
      knownAvailableRef.current = new Set(available.map(o => o.id));
      setAvailableCount(available.length);

    } catch (err) {
      const msg = mensagemDeErro(err, 'Não foi possível carregar as estatísticas.',
        'Sem conexão. Os números voltam sozinhos quando o sinal voltar.');
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



  // Abre o prompt de avaliação pós-entrega (restaurante + cliente). Basta ter UM
  // dos dois pra valer a pena abrir: antes exigia client_id e, quando o pedido
  // vinha sem esse campo, a avaliação simplesmente não aparecia — o entregador
  // terminava a entrega e nada acontecia.

  // Fecha o modal de dinheiro e, em seguida, oferece avaliar o cliente daquele
  // pedido — mantém a sequência entrega → dinheiro → avaliação.



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
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
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
              {/* PEDIDOS DISPONÍVEIS — BOTÃO, não enfeite.
                  Isto era uma <div>. Tinha borda, cantos arredondados, ícone e
                  um contador pulsando: tudo que faz uma coisa PARECER botão. E
                  não fazia nada.
                  Em 13/09/2026 o Fernando tocou aqui pra pegar a entrega da Me
                  Mimei, não aconteceu nada, e ele avisou que "não conseguiu
                  aceitar". O pedido ficou parado com a cliente esperando. Eu
                  cheguei a atribuir isso à janela de 60s da oferta — não era:
                  ele nunca chegou na tela.
                  Elemento que parece clicável TEM que ser clicável, ou não deve
                  parecer. */}
              {availableCount > 0 && (
                <button
                  onClick={() => navigate('/delivery/entregas')}
                  aria-label={`Ver ${availableCount} pedido(s) disponível(is)`}
                  className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 border border-orange-200 rounded-xl px-3 py-2 min-h-[44px] transition-colors cursor-pointer"
                >
                  <Package className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-700">Disponíveis</span>
                  <PulsingBadge count={availableCount} />
                </button>
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
                <p className="text-2xl font-black">{brl(toNumber(dashboardStats?.totalCashReceived))}</p>
              </div>
              <div>
                <p className="text-xs text-white/80 mb-0.5">Débito com plataforma</p>
                <p className="text-2xl font-black">{brl(toNumber(dashboardStats?.cashDebt))}</p>
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

      {/* ── Delivery code modal ────────────────────────────────────────────── */}

      {/* ── Avaliar cliente após entrega ───────────────────────────────────────
          Aparece logo depois de confirmar a entrega (e do modal de dinheiro,
          quando for o caso), oferecendo avaliar o cliente ou deixar pra depois.
          "Deixar para depois" não perde nada: o pedido continua na lista de
          avaliações pendentes na Central de Avaliações. */}
    </div>
  );
}
