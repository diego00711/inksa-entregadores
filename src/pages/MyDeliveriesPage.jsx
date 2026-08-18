// src/pages/MyDeliveriesPage.jsx – VERSÃO COMPLETA (finalização com delivery_code)

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import DeliveryService from '../services/deliveryService.js';
import { DeliveryCard } from '../components/DeliveryCard.jsx';
import { DeliveryDetailModal } from '../components/DeliveryDetailModal.jsx';
import { MapDisplay } from '../components/MapDisplay.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '../components/Header.jsx';
import { Loader2, PackageSearch, MapPin, Phone, Eye, EyeOff, ExternalLink, Route, Package, AlertTriangle, MessageCircle, CheckCircle, Star } from 'lucide-react';
import { acceptDelivery, completeDelivery, reportIncident, confirmReturn, getOrdersToReview } from '../services/orderService';
import ReportIncidentModal from '../components/ReportIncidentModal.jsx';
import PostDeliveryRating from '../components/PostDeliveryRating.jsx';
import { DELIVERY_API_URL } from '../services/api';
import { useChatAlarmCtx } from '../hooks/useChatAlarm.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { getPageCache, setPageCache } from '../lib/pageCache.js';

const CACHE_KEY = 'delivery:minhas-entregas';

// Extrai coordenadas [lat, lng] de um pedido, tolerando vários nomes de campo
const parseCoords = (lat, lng) => {
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && (a !== 0 || b !== 0) ? [a, b] : null;
};
const getDeliveryCoords = (o) =>
  parseCoords(
    o?.client_latitude ?? o?.delivery_latitude ?? o?.latitude,
    o?.client_longitude ?? o?.delivery_longitude ?? o?.longitude
  );
const getPickupCoords = (o) =>
  parseCoords(
    o?.restaurant_latitude ?? o?.pickup_latitude,
    o?.restaurant_longitude ?? o?.pickup_longitude
  );

export function MyDeliveriesPage() {
  const { profile, loading: profileLoading } = useProfile();
  const addToast = useToast();
  // Se já visitou essa tela antes na mesma sessão, mostra os últimos dados
  // vistos na hora (sem tela de carregamento) enquanto atualiza por baixo —
  // em vez de sempre partir do zero toda vez que navega até aqui.
  const cached = getPageCache(CACHE_KEY);
  const [availableOrders, setAvailableOrders] = useState(cached?.availableOrders ?? []);
  const [myDeliveries, setMyDeliveries] = useState(cached?.myDeliveries ?? []);
  const [pageLoading, setPageLoading] = useState(!cached);
  const [activeFilter, setActiveFilter] = useState('available');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeDelivery, setActiveDelivery] = useState(cached?.activeDelivery ?? null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showMap, setShowMap] = useState(true);
  // { km, min } da rota real, vindo do mapa. null enquanto não deu pra calcular
  // — e aí o chip simplesmente não aparece, em vez de mostrar "0 km".
  const [routeInfo, setRouteInfo] = useState(null);
  // Painel recolhido (mostra o mapa) x aberto (mostra tudo). Existe porque o
  // conteudo NAO cabe em meia tela: codigo de retirada + valor em dinheiro +
  // endereco + 3 botoes + chat + confirmar passa de 400px. Sem isso a escolha
  // era mapa grande OU informacao inteira, e o Diego pediu os dois.
  const [painelAberto, setPainelAberto] = useState(false);
  const [driverCoords, setDriverCoords] = useState(null); // posição do entregador ao vivo (GPS)
  const [pendingFinishId, setPendingFinishId] = useState(null);
  const [finishCode, setFinishCode] = useState('');
  const [finishing, setFinishing] = useState(false); // trava anti-duplo-clique no "Confirmar" do código
  const [incidentOrderId, setIncidentOrderId] = useState(null);
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  // Chat: fonte ÚNICA compartilhada com o FAB do layout (ChatAlarmContext). O
  // badge do botão de chat do card lê o MESMO `unread`, então mensagem que
  // chegou em outra tela (Início) continua contando aqui — e abrir o chat pelo
  // card ou pelo FAB é o mesmo estado.
  const chat = useChatAlarmCtx();
  // Avaliação do cliente após concluir a entrega ("Avaliar / deixar pra depois")
  const [pendingReviewOrder, setPendingReviewOrder] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  // Resumo do dinheiro devolvido pelo backend ao fechar uma entrega em dinheiro
  // ({voce_recebeu, sua_taxa, deve_a_plataforma, ..., _order}).
  const [cashInfo, setCashInfo] = useState(null);
  // (O aviso de nova mensagem do cliente — toast/bip/badge — agora é ÚNICO e vive
  // no layout via useChatAlarm/ChatAlarmContext; este card só LÊ o `unread`.)

  const fetchOrderWithPickupCode = async (orderId) => {
    try {
      const token = localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token');
      const apiUrl = DELIVERY_API_URL;
      const response = await fetch(`${apiUrl}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) return await response.json();
      return null;
    } catch (e) {
      console.error('Erro ao buscar detalhes:', e);
      return null;
    }
  };

  // Só mostra a tela cheia de carregamento na 1a busca. Nas atualizações
  // automáticas seguintes (a cada 30s), os dados trocam por baixo sem
  // reconstruir a página inteira — antes isso derrubava o mapa e reiniciava
  // o carregamento dos tiles a cada ciclo, parecendo "o mapa fica
  // recarregando sozinho".
  const hasLoadedOnceRef = useRef(!!cached);

  const fetchDeliveries = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setPageLoading(true);
    try {
      const stats = await DeliveryService.getDashboardStats();
      let myActive = stats.activeOrders || [];

      const withPickup = await Promise.all(
        myActive.map(async (order) => {
          if (order.pickup_code) return order;
          const full = await fetchOrderWithPickupCode(order.id);
          return full?.pickup_code ? { ...order, pickup_code: full.pickup_code } : order;
        })
      );
      setMyDeliveries(withPickup);

      // disponíveis
      let available = [];
      try {
        const token = localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token');
        const apiUrl = DELIVERY_API_URL;
        const resp = await fetch(`${apiUrl}/api/orders/available`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        available = resp.ok ? await resp.json() : [];
        setAvailableOrders(available);
      } catch (e) {
        console.error('Erro ao buscar disponíveis:', e);
      }

      // quais contam como “em andamento”
      const ongoing = withPickup.find((d) =>
        ['pending', 'accepted', 'accepted_by_delivery', 'picked_up', 'on_the_way', 'ready', 'preparing', 'delivering'].includes(d.status)
      );
      setActiveDelivery(ongoing);

      setPageCache(CACHE_KEY, { availableOrders: available, myDeliveries: withPickup, activeDelivery: ongoing });
    } catch (err) {
      console.error('Erro ao carregar entregas:', err);
      addToast(err?.message || 'Não foi possível carregar as entregas.', 'error');
    } finally {
      setPageLoading(false);
      hasLoadedOnceRef.current = true;
    }
  }, [addToast]);

  const { pulling, refreshing } = usePullToRefresh(fetchDeliveries);

  useEffect(() => {
    fetchDeliveries();
    const id = setInterval(fetchDeliveries, 6000);
    return () => clearInterval(id);
  }, [fetchDeliveries]);

  // GPS ao vivo do entregador enquanto houver entrega ativa (alimenta o mapa)
  useEffect(() => {
    if (!activeDelivery || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setDriverCoords([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDelivery?.id]);

  const filteredDeliveries = useMemo(() => {
    if (activeFilter === 'available') return availableOrders;
    if (activeFilter === 'all') return myDeliveries;
    const ongoingStatus = ['pending', 'accepted', 'accepted_by_delivery', 'picked_up', 'on_the_way', 'ready', 'preparing', 'delivering'];
    if (activeFilter === 'ongoing') return myDeliveries.filter((d) => ongoingStatus.includes(d.status));
    if (activeFilter === 'delivered') return myDeliveries.filter((d) => d.status === 'delivered');
    return myDeliveries;
  }, [availableOrders, myDeliveries, activeFilter]);

  const handleFilterClick = (filter) => {
    setIsFiltering(true);
    setActiveFilter(filter);
    setTimeout(() => setIsFiltering(false), 300);
  };

  const handleUpdateStatus = (orderId, newStatus) => {
    setMyDeliveries((list) => list.map((d) => (d.id === orderId ? { ...d, status: newStatus } : d)));
    // Guarda o `prev`: se o poll de fundo (15s) zerou o activeDelivery durante o
    // await do complete, `prev` chega null aqui. `{...null, status}` viraria um
    // objeto SEM id, e o card estourava em `activeDelivery.id.substring` (tela
    // branca pós-confirmar código). Se não há mais entrega ativa, não recria.
    if (activeDelivery?.id === orderId) setActiveDelivery((prev) => (prev ? { ...prev, status: newStatus } : prev));
    if (isModalOpen) setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
  };

  const handleCardClick = async (order) => {
    setIsModalOpen(true);
    setIsModalLoading(true);
    try {
      if (activeFilter === 'available') setSelectedOrder(order);
      else setSelectedOrder(await DeliveryService.getOrderDetail(order.id));
    } catch (e) {
      console.error('Erro ao buscar detalhes:', e);
      setIsModalOpen(false);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleCloseModal = () => { setIsModalOpen(false); setSelectedOrder(null); };
  const handleDeliverySelect = (delivery) => setActiveDelivery(delivery);

  const finishFromHere = (orderId) => {
    setPendingFinishId(orderId);
    setFinishCode('');
  };

  // Busca o pedido recém-entregue na lista de "avaliações pendentes" do backend
  // — a mesma que alimenta a Central de Avaliações. Traz client_id/client_name e
  // restaurant_id/restaurant_name, que é o que o formulário precisa. Cai no
  // objeto local se a chamada falhar.
  const resolveReviewOrder = async (orderId, fallback) => {
    try {
      const pendentes = await getOrdersToReview();
      const achado = pendentes.find(o => String(o.id) === String(orderId));
      if (achado) return achado;
    } catch {
      /* rede fora: usa o que já temos em memória */
    }
    return fallback;
  };

  const confirmFinish = async () => {
    if (finishing) return; // já está confirmando — ignora cliques repetidos
    const deliveryCode = String(finishCode).trim().toUpperCase();
    if (deliveryCode.length < 3) return;
    setFinishing(true);
    try {
      const finishedId = pendingFinishId;
      const finishedOrder =
        (activeDelivery?.id === finishedId ? activeDelivery : null) ||
        myDeliveries.find(o => o.id === finishedId) || null;
      const res = await completeDelivery(finishedId, deliveryCode);
      handleUpdateStatus(finishedId, 'delivered');
      setPendingFinishId(null);
      setFinishCode('');
      addToast('Entrega concluída com sucesso!', 'success');
      // Pedido em dinheiro: o backend já liquidou no fechamento e devolve o
      // resumo — mostra "você recebeu / deve à plataforma". A avaliação abre
      // depois que esse modal fechar (ver closeCashInfo).
      // Resolve o pedido a avaliar pela MESMA fonte da Central de Avaliações
      // (/pending-delivery-review). Antes dependíamos só do objeto em memória —
      // se ele não fosse encontrado (refetch entre abrir e confirmar, lista já
      // atualizada), o modal simplesmente não abria e o entregador tinha que ir
      // na Central. Agora, se aparece na Central, aparece aqui.
      const reviewOrder = await resolveReviewOrder(finishedId, finishedOrder);

      const cash = res?.cash || res?.data?.cash || null;
      if (cash) {
        setCashInfo({ ...cash, _order: reviewOrder });
      } else if (reviewOrder) {
        setShowReviewForm(false);
        setPendingReviewOrder(reviewOrder);
      }
    } catch (e) {
      console.error('Erro ao completar entrega:', e);
      addToast(e?.message || 'Erro ao confirmar entrega. Verifique o código e tente novamente.', 'error');
    } finally {
      setFinishing(false);
    }
  };

  // Fecha o resumo do dinheiro e, em seguida, oferece avaliar o cliente —
  // mantém a sequência entrega → dinheiro → avaliação (igual ao dashboard).
  const closeCashInfo = () => {
    const order = cashInfo?._order;
    setCashInfo(null);
    if (order?.client_id || order?.restaurant_id) {
      setShowReviewForm(false);
      setPendingReviewOrder(order);
    }
  };

  const handleReportIncident = async ({ reason, notes, contactAttempts, photoUrl }) => {
    if (!incidentOrderId) return;
    setIncidentSubmitting(true);
    const orderForReturn = activeDelivery; // captura antes de limpar
    try {
      // O BOT decide o desfecho no backend e devolve outcome/return_code/instrução.
      const res = await reportIncident(incidentOrderId, { reason, notes, contactAttempts, photoUrl });
      handleUpdateStatus(incidentOrderId, 'delivery_failed');
      setIncidentOrderId(null);
      addToast('Ocorrência registrada.', 'success');
      // Mostra a orientação do bot. QUEM confirma a devolução agora é o
      // RESTAURANTE (validando o código) — o entregador só leva e mostra o código.
      setReturnOrder({
        ...(orderForReturn || {}),
        _outcome: res?.outcome || null,          // 'dispose' | 'awaiting_restaurant'
        _returnCode: res?.return_code || null,
        _instruction: res?.instruction || '',
      });
      setActiveDelivery(null);
      fetchDeliveries();
    } catch (e) {
      console.error('Erro ao reportar ocorrência:', e);
      addToast(e?.message || 'Erro ao registrar a ocorrência.', 'error');
    } finally {
      setIncidentSubmitting(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnOrder) return;
    setConfirmingReturn(true);
    try {
      await confirmReturn(returnOrder.id);
      addToast('Devolução confirmada. Obrigado!', 'success');
      setReturnOrder(null);
      setActiveDelivery(null);
      fetchDeliveries();
    } catch (e) {
      addToast(e?.message || 'Erro ao confirmar a devolução.', 'error');
    } finally {
      setConfirmingReturn(false);
    }
  };

  if (pageLoading || profileLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Fase da entrega: antes de retirar → rota ao RESTAURANTE; depois → ao CLIENTE
  const isDeliveryPhase = !!activeDelivery && ['delivering', 'on_the_way', 'picked_up', 'delivered'].includes(activeDelivery.status);
  const navAddress = !activeDelivery
    ? ''
    : isDeliveryPhase
      ? (activeDelivery.delivery_address || '')
      : [activeDelivery.restaurant_name, activeDelivery.restaurant_street, activeDelivery.restaurant_number, activeDelivery.restaurant_neighborhood, activeDelivery.restaurant_city].filter(Boolean).join(', ');

  return (
    <div className="flex-1 flex flex-col">
      {(pulling || refreshing) && (
        <div className="flex justify-center py-3">
          <div className="w-6 h-6 border-2 border-[#FF6F00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* A saudação ("Boa noite, fulano — confira as entregas disponíveis")
          é pra quem está sem nada pra fazer. Com entrega em andamento ela
          rouba ~100px do mapa pra dizer algo que não ajuda em nada na rua.
          No desktop sobra altura, então lá ela fica. */}
      <div className={activeDelivery?.id ? 'hidden lg:block' : ''}>
        <Header />
      </div>
      <main className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full">
          {/* ENTREGA ATIVA — o mapa é o FUNDO, a informação flutua por cima.
              Antes era um mapa de 240px dentro de um card, com os dados embaixo:
              o entregador tinha que escolher entre ver onde está e ver o que
              fazer. Agora o trajeto ocupa a tela e o painel desliza por cima. */}
          <Card className={`shadow-sm overflow-hidden ${
            activeDelivery?.id
              // Sangra ate a borda no celular: margem em volta de um mapa que
              // deveria ser fundo denuncia que ele e um card, nao a tela.
              ? '-mx-4 -mt-4 rounded-none border-x-0 border-t-0 md:mx-0 md:mt-0 md:rounded-lg md:border'
              : ''
          }`}>
            {!activeDelivery?.id ? (
              <>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center">
                    <MapPin className="w-5 h-5 mr-2" /> Mapa de Entregas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div style={{ height: '280px' }} className="flex items-center justify-center bg-gray-50">
                    <div className="text-center px-4">
                      <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium mb-1">Nenhuma entrega ativa no momento</p>
                      <p className="text-sm text-gray-400">O mapa aparece quando você tiver uma entrega em andamento</p>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-0">
                {/* A ALTURA MORA AQUI, não no filho.
                    Antes o container tinha altura automática vinda do mapa e
                    62vh de altura — dava um card alto DENTRO de uma página que
                    rola. Bastava rolar pra alcançar "Pedidos Disponíveis" e o
                    mapa sumia atrás do cabeçalho fixo, junto com os chips de
                    fase e distância. "Mapa de fundo" só é fundo se ele for a
                    tela.
                    dvh (e não vh) porque no celular a barra do navegador entra
                    e sai: com vh o painel fica atrás dela quando ela aparece.
                    13rem = cabeçalho + barra de baixo + a folga que deixa a
                    lista espiando embaixo — a espiada é de propósito, é o que
                    avisa que tem mais coisa se rolar. */}
                <div className="relative h-[calc(100dvh-8rem)] min-h-[420px] lg:h-[600px]">
                  {/* Camada de baixo: o trajeto preenchendo o bloco inteiro */}
                  {showMap && (getPickupCoords(activeDelivery) || getDeliveryCoords(activeDelivery)) ? (
                    <div className="absolute inset-0">
                      <MapDisplay
                        fullscreen
                        driverCoords={driverCoords}
                        pickupCoords={getPickupCoords(activeDelivery)}
                        deliveryCoords={getDeliveryCoords(activeDelivery)}
                        phase={isDeliveryPhase ? 'delivery' : 'pickup'}
                        onRouteInfo={setRouteInfo}
                        vehicle={profile?.vehicle_type}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 px-6 text-center">
                      <p className="text-sm text-gray-500">
                        {(getPickupCoords(activeDelivery) || getDeliveryCoords(activeDelivery))
                          ? 'Mapa oculto. Toque no 👁️ para mostrar o trajeto.'
                          : 'Localização ainda não disponível para o mapa.'}
                      </p>
                    </div>
                  )}

                  {/* ── Faixa de cima: para onde você vai, e quanto falta ──────
                      pointer-events-none no container pra não roubar o arrasto
                      do mapa; só o botão do olho recebe toque. */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
                    <div className="flex flex-col gap-2 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur ${
                        isDeliveryPhase ? 'bg-green-600/95 text-white' : 'bg-orange-500/95 text-white'
                      }`}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {isDeliveryPhase ? 'Indo ao cliente' : 'Indo ao restaurante'}
                      </span>
                      {routeInfo && (
                        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-lg backdrop-blur">
                          <Route className="w-3.5 h-3.5 shrink-0 text-[#FF6F00]" />
                          {routeInfo.km.toFixed(1).replace('.', ',')} km
                          <span className="text-gray-400">·</span>
                          ~{routeInfo.min} min
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowMap(!showMap)}
                      className="pointer-events-auto shrink-0 rounded-full bg-white/95 p-2.5 text-gray-700 shadow-lg backdrop-blur active:scale-95"
                      aria-label={showMap ? 'Ocultar mapa' : 'Mostrar mapa'}
                    >
                      {showMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* ── Painel de vidro por cima da base do mapa ──────────────
                      max-h + scroll próprio: com pedido em dinheiro + código +
                      5 botões o conteúdo passa de meia tela, e sem isto ele
                      cobriria o mapa inteiro (justamente o que a gente quer
                      evitar). */}
                  {/* O "!" não é preciosismo: App.css tem, dentro de
                      @media (max-width:1023px), um
                        .overflow-y-auto { max-height: calc(100dvh - 120px) !important }
                      que sequestra TODA classe de scroll do app no celular.
                      Era ele que engolia o teto do painel — no aparelho o
                      painel virava 692px numa área de 604px e cobria o mapa
                      inteiro, calado. Medido por eliminação: sem overflow o
                      teto vale (365px), com overflow vira 692px.

                      Teto em dvh e não em %: porcentagem se mede contra o pai,
                      dvh contra a janela. Uma coisa a menos que pode não
                      resolver. */}
                  {/* ALTURA POR FATIA DO HERÓI, não em dvh.
                      Antes o painel tinha max-h em dvh enquanto o herói tinha
                      outra conta (100dvh menos um punhado de rem). As duas não
                      conversavam: alternar mudava um número que não mudava o
                      que aparece — no aparelho do Diego "abrir" não abria nada.
                      Com top+bottom a altura vem do próprio bloco do mapa, que
                      é o que a gente quer dividir. Não depende de dvh, nem do
                      tamanho da fonte, nem de quanto conteúdo tem dentro. */}
                  <div className={`absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-2xl border-t border-white/60 bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] backdrop-blur-md ${
                    painelAberto ? 'top-[12%]' : 'top-[62%]'
                  }`}>
                    {/* A alca AGORA FUNCIONA. Antes era um risquinho decorativo:
                        parecia arrastavel e nao era, entao o conteudo so rolava
                        e rolar num painel baixo parece corte. Prometer um gesto
                        e nao cumprir e pior que nao ter gesto nenhum. */}
                    <button
                      type="button"
                      onClick={() => setPainelAberto((v) => !v)}
                      aria-expanded={painelAberto}
                      className="flex w-full flex-col items-center gap-1 py-2 active:bg-gray-50"
                    >
                      <span className="h-1 w-10 rounded-full bg-gray-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        {painelAberto ? 'tocar para ver o mapa' : 'tocar para ver tudo'}
                      </span>
                    </button>
                    {/* O corte reto no fim do painel parecia informação perdida,
                        não conteúdo rolável — o Diego leu como bug. A faixa que
                        desbota embaixo é o que diz "tem mais, continua". Ela
                        precisa ficar FORA da área que rola, senão desce junto
                        e desaparece na primeira rolada. */}
                    <div className="relative min-h-0 flex-1">
                      <div className="h-full max-h-full overflow-y-auto overscroll-contain">
                        <div className="px-4 pb-6 pt-1 space-y-3">
                    {/* A fase saiu daqui: ela virou o chip laranja/verde sobre o
                        mapa. Repetir no painel gastaria a linha mais nobre com
                        algo que já está na tela. */}
                    <h3 className="font-semibold text-gray-800 text-sm">
                      Entrega ativa #{activeDelivery.id.substring(0, 8)}
                    </h3>

                    {activeDelivery.pickup_code && !isDeliveryPhase && (
                      <div className="bg-purple-50 p-2 rounded border border-purple-200">
                        <p className="text-xs text-purple-700 mb-1">Código de Retirada:</p>
                        <p className="text-lg font-bold text-purple-800 tracking-widest">{activeDelivery.pickup_code}</p>
                      </div>
                    )}

                    {activeDelivery.payment_method === 'cash' && (
                      <div className="bg-orange-50 border border-orange-200 rounded p-2 text-sm font-bold text-orange-700">
                        💵 Cobrar R$ {Number(activeDelivery.total_amount || 0).toFixed(2)} em dinheiro
                        {Number(activeDelivery.change_for || 0) > Number(activeDelivery.total_amount || 0) && (
                          <div className="mt-0.5 text-xs font-semibold text-orange-600">
                            Levar troco de R$ {(Number(activeDelivery.change_for) - Number(activeDelivery.total_amount)).toFixed(2)} (cliente vai pagar com R$ {Number(activeDelivery.change_for).toFixed(2)})
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 break-words">
                      <span className="font-medium">{activeDelivery.client_name || 'Cliente'}</span>
                      {activeDelivery.delivery_address ? ` — ${activeDelivery.delivery_address}` : ''}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        size="sm" variant="outline" className="flex-1 min-w-0"
                        onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(navAddress)}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1 shrink-0" /> Waze
                      </Button>
                      <Button
                        size="sm" variant="outline" className="flex-1 min-w-0"
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navAddress)}`, '_blank')}
                      >
                        <Route className="w-4 h-4 mr-1 shrink-0" /> Maps
                      </Button>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => window.open(`tel:${activeDelivery.customer?.phone || ''}`, '_self')}>
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Chat com o cliente direto daqui — antes só dava pra abrir
                        entrando no modal de detalhe, então o entregador nem via
                        que o cliente mandou mensagem. */}
                    {['accepted_by_delivery', 'ready', 'picked_up', 'on_the_way', 'delivering'].includes(activeDelivery.status) && (
                      <button
                        onClick={() => chat.setOpen(true)}
                        className="relative w-full text-sm font-bold text-[#FF6F00] border-2 border-[#FF6F00] bg-white hover:bg-orange-50 rounded-lg py-2 flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <MessageCircle className="w-4 h-4" /> Chat com cliente
                        {chat.unread > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 ring-2 ring-white">
                            {chat.unread > 9 ? '9+' : chat.unread}
                          </span>
                        )}
                      </button>
                    )}

                    {/* Confirmar entrega (abre o código) sem voltar pra tela
                        Início — resolve o "sair de Entregas pra pegar o cod". */}
                    {isDeliveryPhase && activeDelivery.status !== 'delivered' && (
                      <button
                        onClick={() => finishFromHere(activeDelivery.id)}
                        className="w-full text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg py-2.5 flex items-center justify-center gap-1.5 min-h-[44px] shadow"
                      >
                        <CheckCircle className="w-4 h-4" /> Confirmar entrega (código)
                      </button>
                    )}

                    {/* "Não consegui entregar" só faz sentido DEPOIS de retirar o
                        pedido no restaurante (isDeliveryPhase). Antes disso, se
                        deu problema, é só não retirar / falar com o restaurante. */}
                    {isDeliveryPhase && activeDelivery.status !== 'delivered' && (
                      <button
                        onClick={() => setIncidentOrderId(activeDelivery.id)}
                        className="w-full text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg py-2 flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <AlertTriangle className="w-4 h-4" /> Não consegui entregar
                      </button>
                    )}
                        </div>
                      </div>
                      {!painelAberto && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* LISTA DE ENTREGAS */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg font-bold">
                  {activeFilter === 'available' ? 'Pedidos Disponíveis' : 'Histórico de Entregas'}
                </CardTitle>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full sm:w-auto scrollbar-none">
                  <Button
                    size="sm"
                    variant={activeFilter === 'available' ? 'default' : 'ghost'}
                    onClick={() => handleFilterClick('available')}
                    className="whitespace-nowrap"
                  >
                    <Package className="w-4 h-4 mr-1" /> Disponíveis
                    {availableOrders.length > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{availableOrders.length}</span>
                    )}
                  </Button>
                  <Button size="sm" variant={activeFilter === 'all' ? 'default' : 'ghost'} onClick={() => handleFilterClick('all')}>
                    Todas
                  </Button>
                  <Button size="sm" variant={activeFilter === 'ongoing' ? 'default' : 'ghost'} onClick={() => handleFilterClick('ongoing')}>
                    Em Andamento
                  </Button>
                  <Button size="sm" variant={activeFilter === 'delivered' ? 'default' : 'ghost'} onClick={() => handleFilterClick('delivered')}>
                    Concluídas
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 overflow-y-auto" style={{ maxHeight: '420px' }}>
              {isFiltering ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredDeliveries.length > 0 ? (
                <div className="space-y-4">
                  {filteredDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className={`cursor-pointer transition-all ${
                        activeDelivery && activeDelivery.id === delivery.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => activeFilter !== 'available' && handleDeliverySelect(delivery)}
                    >
                      <DeliveryCard
                        delivery={delivery}
                        onClick={() => handleCardClick(delivery)}
                        isAvailable={activeFilter === 'available'}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 h-full">
                  <PackageSearch className="w-16 h-16 text-muted-foreground/50" />
                  <h3 className="text-xl font-semibold">Nenhuma entrega encontrada</h3>
                  <p className="text-muted-foreground text-center">
                    {activeFilter === 'available'
                      ? 'Não há pedidos disponíveis no momento. Aguarde por novas oportunidades!'
                      : 'Tente selecionar outro filtro ou aguarde por novas oportunidades.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {isModalOpen && (
        <DeliveryDetailModal
          order={selectedOrder}
          onClose={handleCloseModal}
          isLoading={isModalLoading}
          onUpdateStatus={(id, st) => (st === 'delivered' ? finishFromHere(id) : undefined)}
          isAvailable={activeFilter === 'available'}
        />
      )}

      {/* O ChatModal do chat com o cliente vive no layout (global), aberto pelo
          botão do card via chat.setOpen — não é mais montado aqui. */}

      {pendingFinishId && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 mx-0 sm:mx-4" style={{ paddingBottom: '1.5rem' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Código de Entrega</h3>
            <p className="text-sm text-gray-500 mb-4">Peça o código de 4 letras ao cliente para confirmar a entrega.</p>
            <input
              type="text"
              value={finishCode}
              onChange={e => setFinishCode(e.target.value.toUpperCase())}
              placeholder="Ex: ABCD"
              maxLength={6}
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-base font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
              onKeyDown={e => { if (e.key === 'Enter') confirmFinish(); }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setPendingFinishId(null); setFinishCode(''); }}
                disabled={finishing}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFinish}
                disabled={finishing || finishCode.trim().length < 3}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {finishing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Confirmando...</>) : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumo do dinheiro recebido (entrega em dinheiro). O backend já
          registrou a dívida no fechamento; aqui é só o entregador ver quanto
          recebeu e quanto fica devendo à plataforma. */}
      {cashInfo && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 max-h-[90vh] overflow-y-auto mx-0 sm:mx-4" style={{ paddingBottom: '1.5rem' }}>
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">💵</div>
              <h3 className="text-lg font-bold text-gray-800">Recebimento em dinheiro</h3>
              <p className="text-sm text-gray-500 mt-1">Você recebeu este pedido em espécie.</p>
            </div>
            <div className="space-y-2 bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Você recebeu</span>
                <span className="font-bold text-green-600">R$ {Number(cashInfo.voce_recebeu || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sua taxa de entrega</span>
                <span className="font-bold text-blue-600">R$ {Number(cashInfo.sua_taxa || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm text-gray-600">Você deve à plataforma</span>
                <span className="font-bold text-orange-600">R$ {Number(cashInfo.deve_a_plataforma || 0).toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4 text-center">
              R$ {Number(cashInfo.deve_a_plataforma || 0).toFixed(2)} será descontado do seu próximo repasse online.
            </p>
            <button
              onClick={closeCashInfo}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}

      {/* Avaliar cliente após a entrega — "Avaliar / deixar pra depois".
          Deixar pra depois não perde nada: o pedido segue na Central de
          Avaliações pra avaliar quando quiser. */}
      {pendingReviewOrder && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 max-h-[90vh] overflow-y-auto mx-0 sm:mx-4" style={{ paddingBottom: '1.5rem' }}>
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

      <ReportIncidentModal
        isOpen={!!incidentOrderId}
        orderId={incidentOrderId}
        submitting={incidentSubmitting}
        onClose={() => setIncidentOrderId(null)}
        onConfirm={handleReportIncident}
      />

      {/* Resultado da ocorrência: o BOT já decidiu. Descartar → só confirma;
          Aguardando restaurante → mostra o código pra QUANDO ele pedir a
          devolução (é o RESTAURANTE que valida o código, não o entregador). */}
      {returnOrder && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-sm p-6" style={{ paddingBottom: '1.5rem' }}>
            {returnOrder._outcome === 'dispose' ? (
              <>
                <div className="text-center mb-3">
                  <div className="text-4xl mb-2">🗑️</div>
                  <h3 className="text-lg font-bold text-gray-800">Pode descartar o pedido</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {returnOrder._instruction || 'Ocorrência registrada — nossa equipe cuida do resto.'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-3">
                  <div className="text-4xl mb-2">🔁</div>
                  <h3 className="text-lg font-bold text-gray-800">Aguarde o restaurante</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {returnOrder._instruction || 'O restaurante vai dizer se quer a devolução.'}
                  </p>
                </div>
                {returnOrder._returnCode && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 text-center">
                    <p className="text-xs text-purple-700 mb-1">Se pedirem a devolução, mostre este código no balcão:</p>
                    <p className="text-2xl font-extrabold text-purple-800 tracking-widest">{returnOrder._returnCode}</p>
                    <p className="text-[11px] text-purple-600 mt-1">O restaurante confirma a devolução com ele.</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    const addr = returnOrder.restaurant_address || returnOrder.restaurant?.address || returnOrder.restaurant_name || '';
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, '_blank');
                  }}
                  className="w-full mb-2 min-h-[44px] py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Route className="w-4 h-4" /> Rota até o restaurante
                </button>
              </>
            )}
            <button
              onClick={() => { setReturnOrder(null); setActiveDelivery(null); }}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
