// src/pages/MyDeliveriesPage.jsx – VERSÃO COMPLETA (finalização com delivery_code)

import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import DeliveryService from '../services/deliveryService.js';
import { DeliveryCard } from '../components/DeliveryCard.jsx';
import { DeliveryDetailModal } from '../components/DeliveryDetailModal.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '../components/Header.jsx';
import {
  Loader2, PackageSearch, MapPin, Phone, Eye, EyeOff, Route, Package,
  AlertTriangle, MessageCircle, CheckCircle, Star, Navigation,
} from 'lucide-react';
import { acceptDelivery, completeDelivery, pickupOrder, reportIncident, getOrdersToReview } from '../services/orderService';
import ReportIncidentModal from '../components/ReportIncidentModal.jsx';
import PostDeliveryRating from '../components/PostDeliveryRating.jsx';
import { DELIVERY_API_URL } from '../services/api';
// ⚠️ Import na MESMA edição em que o uso entrou (a regra das duas telas brancas).
import apiFetch from '../services/apiClient';
import { useChatAlarmCtx } from '../hooks/useChatAlarm.js';
import { useToast } from '../context/ToastContext.jsx';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { getPageCache, setPageCache } from '../lib/pageCache.js';
import { numeroPedido } from '../utils/pedidoNumero';
import { brl } from '../utils/dinheiro';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';
import { limparCodigo, codigoCompleto, AVISO_CODIGO } from '../utils/codigoDoPedido';
import { abrirWaze, destinoDaCorrida, pedirAtalhoDeVolta } from '../utils/navegacao';

// ⚠️ MAPA CARREGADO SÓ QUANDO APARECE — não troque por import estático.
//
// O MapDisplay arrasta o Leaflet junto, e o Leaflet é ~180 KB dos 207 KB desta
// tela. Só que o mapa é condicional: não existe sem entrega ativa, e o
// entregador ainda pode escondê-lo no 👁️. Ou seja, a maior parte do peso
// baixava para não ser usada.
//
// E mesmo COM entrega ativa isso ganha: o que a pessoa precisa na hora é o
// endereço, o código de retirada e o botão — não o mapa. Carregando à parte,
// tudo isso pinta primeiro, em vez de esperar 180 KB numa conexão de rua.
//
// Mesmo tratamento que o gráfico da tela de Ganhos levou (GraficosGanhos).
const MapDisplay = lazy(() =>
  import('../components/MapDisplay.jsx').then((m) => ({ default: m.MapDisplay }))
);

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
  // RETIRADA (20/09/2026): o mesmo trio da entrega, agora pra buscar o pedido
  // na loja. Antes quem confirmava era o parceiro, digitando o código que o
  // entregador mostrava; inverteu.
  const [pendingPickupId, setPendingPickupId] = useState(null);
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [pickingUp, setPickingUp] = useState(false);
  const [incidentOrderId, setIncidentOrderId] = useState(null);
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  // Chat: fonte ÚNICA compartilhada com o FAB do layout (ChatAlarmContext). O
  // badge do botão de chat do card lê o MESMO `unread`, então mensagem que
  // chegou em outra tela (Início) continua contando aqui — e abrir o chat pelo
  // card ou pelo FAB é o mesmo estado.
  const chat = useChatAlarmCtx();
  // Avaliação do cliente após concluir a entrega ("Avaliar / deixar pra depois")
  const [pendingReviewOrder, setPendingReviewOrder] = useState(null);
  // Resumo do dinheiro devolvido pelo backend ao fechar uma entrega em dinheiro
  // ({voce_recebeu, sua_taxa, deve_a_plataforma, ..., _order}).
  const [cashInfo, setCashInfo] = useState(null);
  // AVISO DE CANCELAMENTO.
  //
  // A loja pode cancelar com o entregador já na rua ('accepted_by_delivery' ->
  // 'cancelled' é transição válida no backend). Até 14/09/2026 o resultado na
  // tela era o pior possível: a corrida SUMIA do painel sem uma palavra, e
  // reaparecia na lista como um card cinza escrito "cancelled", em inglês.
  // Ele seguia dirigindo e descobria no balcão.
  const [pedidoCancelado, setPedidoCancelado] = useState(null);
  const ultimaAtivaRef = useRef(null);
  // (O aviso de nova mensagem do cliente — toast/bip/badge — agora é ÚNICO e vive
  // no layout via useChatAlarm/ChatAlarmContext; este card só LÊ o `unread`.)

  // ⚠️ AQUI HAVIA UM `fetchOrderWithPickupCode` — REMOVIDO EM 20/09/2026.
  //
  // Ele buscava o código de retirada de CADA entrega ativa, a cada ciclo de
  // atualização, só pra mostrar o número na tela. Agora o código não vem mais
  // pro entregador: quem mostra é o parceiro, e quem digita é ele.
  //
  // Manter a chamada custaria um 403 por pedido a cada 20 segundos, no app que
  // passa o dia no bolso — e o comentário já explicaria um erro que não existe.

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

      // Sem a volta extra por pedido: o código de retirada não vem mais pra cá
      // (ver o comentário acima). Uma chamada a menos por entrega, por ciclo.
      setMyDeliveries(myActive);

      // disponíveis
      let available = [];
      try {
        // ⚠️ ESTA É A CHAMADA QUE MOSTRA AS CORRIDAS DISPONÍVEIS. Com fetch cru,
        // um token vencido devolvia 401, o `resp.ok` era falso e a lista virava
        // [] — o entregador ficava olhando "nenhuma corrida" sem nada explicando,
        // achando que a praça estava parada. Com apiFetch a sessão é renovada e
        // a chamada repetida antes de desistir.
        const resp = await apiFetch(`${DELIVERY_API_URL}/api/orders/available`, {
          headers: { 'Content-Type': 'application/json' },
        });
        available = resp.ok ? await resp.json() : [];
        setAvailableOrders(available);
      } catch (e) {
        console.error('Erro ao buscar disponíveis:', e);
      }

      // quais contam como “em andamento”
      const ongoing = myActive.find((d) =>
        ['pending', 'accepted', 'accepted_by_delivery', 'picked_up', 'on_the_way', 'ready', 'preparing', 'delivering'].includes(d.status)
      );

      // A corrida que ESTAVA ativa virou cancelada? Então avisa, em vez de
      // deixar ela sumir. Compara com o que estava antes porque a lista não
      // diz "acabou de mudar" — só traz o estado de agora.
      const antes = ultimaAtivaRef.current;
      if (antes) {
        const agora = myActive.find((d) => d.id === antes.id);
        if (agora && ['cancelled', 'canceled'].includes(agora.status)) {
          setPedidoCancelado(agora);
        }
      }
      ultimaAtivaRef.current = ongoing || null;

      setActiveDelivery(ongoing);

      setPageCache(CACHE_KEY, { availableOrders: available, myDeliveries: myActive, activeDelivery: ongoing });
    } catch (err) {
      console.error('Erro ao carregar entregas:', err);
      addToast(mensagemDeErro(err, 'Não foi possível carregar as entregas.',
        'Sem conexão. A lista volta sozinha quando o sinal voltar.'), 'error');
    } finally {
      setPageLoading(false);
      hasLoadedOnceRef.current = true;
    }
  }, [addToast]);

  // Rastreamento por pedido. ESTA é a tela onde o entregador passa a corrida
  // inteira — antes o efeito só existia no DeliveryDashboard, então enquanto
  // ele acompanhava a entrega aqui nenhuma posição era enviada e o mapa do
  // cliente ficava sem entregador. Ver hooks/useOrderTracking.js.
  useOrderTracking(myDeliveries);

  const { pulling, refreshing } = usePullToRefresh(fetchDeliveries);

  // Esconde o botão flutuante de suporte enquanto existe entrega em andamento.
  // Ele é `fixed` e ficava por cima do painel de informações — no teste real
  // do Diego tapava o "Cobrar R$ 17,85 em dinheiro", que é o dado que o
  // entregador precisa ler antes de tocar a campainha. A regra mora no
  // App.css (body.entrega-ativa .fab-suporte). O suporte continua no menu.
  //
  // Limpeza no return: sem ela a classe ficaria grudada no body depois de a
  // entrega acabar, e o suporte sumiria pro resto da sessão.
  useEffect(() => {
    const emEntrega = !!activeDelivery?.id;
    document.body.classList.toggle('entrega-ativa', emEntrega);
    return () => document.body.classList.remove('entrega-ativa');
  }, [activeDelivery?.id]);

  // ── Atualização automática, PARADA COM A TELA APAGADA ─────────────────────
  //
  // Antes era um `setInterval` puro: a cada 20s, para sempre, mesmo com o
  // celular no bolso. E não é uma chamada só — `fetchDeliveries` faz duas
  // (estatísticas + corridas disponíveis) mais uma por entrega ativa sem
  // código de retirada. Numa jornada de 8 horas dá alguns milhares de
  // requisições que ninguém ia ler, gastando dados e, principalmente,
  // acordando o rádio do aparelho — que é onde a bateria vai embora.
  //
  // O painel (DeliveryDashboard) já fazia certo; isto aqui só passou batido.
  // Ao voltar pro app, busca NA HORA em vez de esperar o próximo ciclo: quem
  // reabre a tela quer ver o estado agora, não daqui a 20 segundos.
  useEffect(() => {
    let id;
    const start = () => { if (!id) id = setInterval(fetchDeliveries, 20000); };
    const stop = () => { if (id) { clearInterval(id); id = undefined; } };

    fetchDeliveries();
    start();

    const aoTrocarVisibilidade = () => {
      if (document.visibilityState === 'visible') { fetchDeliveries(); start(); }
      else stop();
    };
    document.addEventListener('visibilitychange', aoTrocarVisibilidade);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade);
    };
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

  const pickupFromHere = (orderId) => {
    setPendingPickupId(orderId);
    setPickupCodeInput('');
  };

  // CONFIRMAR RETIRADA — o entregador digita o código que o PARCEIRO mostra.
  //
  // O sentido era o contrário até 20/09/2026: o entregador mostrava o número e
  // o parceiro digitava. A inversão tira o trabalho de quem está no aperto (o
  // parceiro, com o pedido saindo) e passa pra quem está parado esperando — e
  // mantém a prova de pé, porque o entregador precisa obter um número que ele
  // não tem, e só consegue de frente pro balcão.
  //
  // ⚠️ É por isso que NÃO existe trava de GPS aqui: o código já é a prova de
  // presença. Um raio dependeria da coordenada da loja, e duas das sete lojas
  // não têm coordenada nenhuma — nelas a trava nunca abriria.
  //
  // O servidor conta as tentativas erradas POR PEDIDO (teto de 5) e devolve
  // quantas restam no texto do erro; por isso a mensagem dele passa direto,
  // sem ser trocada por uma genérica.
  const confirmPickup = async () => {
    if (pickingUp) return; // já está confirmando — ignora cliques repetidos
    const codigo = String(pickupCodeInput).replace(/\D/g, '');
    if (!codigoCompleto(codigo)) return;
    setPickingUp(true);
    try {
      const orderId = pendingPickupId;
      await pickupOrder(orderId, codigo);
      handleUpdateStatus(orderId, 'delivering');
      setPendingPickupId(null);
      setPickupCodeInput('');
      addToast('Retirada confirmada! Agora é levar ao cliente.', 'success');
    } catch (e) {
      console.error('Erro ao confirmar retirada:', e);
      addToast(mensagemDeErro(e, 'Não deu pra confirmar a retirada. Confira o código com o parceiro.',
        'Sem conexão agora. O código continua valendo — tente de novo quando o sinal voltar.'), 'error');
    } finally {
      setPickingUp(false);
    }
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
    const deliveryCode = String(finishCode).replace(/\D/g, '');
    if (!codigoCompleto(deliveryCode)) return;
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
        setPendingReviewOrder(reviewOrder);
      }
    } catch (e) {
      console.error('Erro ao completar entrega:', e);
      addToast(mensagemDeErro(e, 'Erro ao confirmar entrega. Verifique o código e tente novamente.',
        'Sem conexão agora. O código continua valendo — tente de novo quando o sinal voltar.'), 'error');
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
      addToast(mensagemDeErro(e, 'Erro ao registrar a ocorrência.',
        'Sem conexão agora. A ocorrência NÃO foi registrada — tente de novo quando o sinal voltar.'), 'error');
    } finally {
      setIncidentSubmitting(false);
    }
  };

  // Aqui existia `handleConfirmReturn`, que chamava POST /confirm-return pra o
  // ENTREGADOR encerrar a devolucao. Ficou sem botao quando o desenho mudou:
  // hoje quem valida o codigo e confirma e o RESTAURANTE (ver o comentario do
  // modal de devolucao mais abaixo). Nada chamava isto.
  // ⚠️ A rota do backend CONTINUA existindo e sem chamador nenhum no app.

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

  return (
    <div className="flex-1 flex flex-col">
      {/* `relative z-10`: o mapa da entrega ativa sobe 2rem (sangria-total) e
          passaria por cima deste spinner, que vem antes dele no DOM e portanto
          perde a pintura. Margem negativa mexe no layout, não na ordem de
          empilhamento — quem resolve isso é o z-index, não a margem. */}
      {(pulling || refreshing) && (
        <div className="relative z-10 flex justify-center py-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
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
              //
              // `sangria-total` mora no App.css e NAO e um atalho de estilo: e
              // o unico jeito que funciona aqui. O `-mx-4` que estava neste
              // lugar era anulado por um `.-mx-4 { margin-left: 0 !important }`
              // do proprio App.css, entao a moldura de 20px continuava. Se um
              // dia isso voltar a aparecer, o culpado esta la, nao aqui.
              // `lg:` e nao `md:` de proposito: o corte do App.css e 1023px e o
              // grid vira duas colunas em `lg`. Com `md:` (768px) as tres
              // coisas discordavam entre 768 e 1023 — o card voltava a ter
              // borda arredondada numa tela onde ainda ocupa a largura toda.
              ? 'sangria-total lg:mx-0 lg:mt-0 lg:w-auto lg:rounded-lg lg:border lg:py-6'
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
                      {/* O fallback ocupa o MESMO espaço do mapa. Um buraco
                          branco aqui pareceria tela quebrada justo na hora em
                          que a pessoa está na rua com pressa. */}
                      <Suspense
                        fallback={
                          <div className="flex h-full w-full items-center justify-center bg-gray-100">
                            <p className="text-sm text-gray-500">Carregando o trajeto…</p>
                          </div>
                        }
                      >
                        <MapDisplay
                          fullscreen
                          driverCoords={driverCoords}
                          pickupCoords={getPickupCoords(activeDelivery)}
                          deliveryCoords={getDeliveryCoords(activeDelivery)}
                          phase={isDeliveryPhase ? 'delivery' : 'pickup'}
                          onRouteInfo={setRouteInfo}
                          vehicle={profile?.vehicle_type}
                        />
                      </Suspense>
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
                  {/* O mapa sobe 2rem (sangria-total no App.css) pra encostar no
                      cabeçalho e ganhar altura. Com os chips em `top-0` do
                      MAPA, eles ficavam nesses 2rem escondidos — a primeira
                      linha aparecia cortada por baixo da tarja laranja.
                      O respiro extra no topo é exatamente a sangria de volta.
                      Só no celular: no desktop não existe sangria. */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-3 pb-3 pt-11 lg:pt-3">
                    <div className="flex flex-col gap-2 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur ${
                        isDeliveryPhase ? 'bg-green-600/95 text-white' : 'bg-orange-500/95 text-white'
                      }`}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {isDeliveryPhase ? 'Indo ao cliente' : 'Indo ao restaurante'}
                        {/* O NÚMERO DO PEDIDO ENTRA AQUI, e não num chip novo,
                            porque já são quatro linhas sobre o mapa e cada uma
                            come altura de rua. Vai junto da fase porque é a
                            mesma frase que o entregador diz no balcão:
                            "pedido mil e dois, código quatro-oito-zero...". */}
                        <span className="opacity-60">·</span>
                        <span className="tabular-nums">{numeroPedido(activeDelivery)}</span>
                        {/* A ROTA ENTROU AQUI, e não numa linha própria.
                            Era o quarto chip da pilha, e pilha alta foi o que
                            empurrou o CÓDIGO pra fora da tela no teste de
                            16/09/2026. Distância e tempo são leitura de relance;
                            cabem na mesma linha da fase sem disputar espaço com
                            o dado que a pessoa precisa LER no balcão. */}
                        {routeInfo && (
                          <>
                            <span className="opacity-60">·</span>
                            <span className="tabular-nums">
                              {routeInfo.km.toFixed(1).replace('.', ',')} km
                            </span>
                            <span className="opacity-60">·</span>
                            <span className="tabular-nums">~{routeInfo.min} min</span>
                          </>
                        )}
                      </span>

                      {/* ── O DADO CRÍTICO, SEMPRE VISÍVEL ───────────────────
                          Recolher o painel só até a alça libertou o mapa, mas
                          escondeu atrás de um toque justamente o que o
                          entregador precisa ler NA HORA. Estes chips resolvem
                          sem devolver meia tela ao painel: ocupam duas linhas
                          sobre o mapa, na mesma linguagem da quilometragem.

                          UM DE CADA VEZ, e depende da FASE — mostrar os dois
                          seria ruído: indo ao restaurante, o que importa é o
                          código que ele vai falar no balcão; indo ao cliente,
                          o que importa é quanto cobrar. O resto continua no
                          painel, a um toque. */}

                      {/* ⚠️ Aqui ficava o CÓDIGO DE RETIRADA, e ele saiu em
                          20/09/2026. A conferência inverteu: o parceiro mostra
                          o número na tela dele e o entregador digita. Um código
                          que o entregador já tem não prova que ele foi na loja.
                          A ação da fase de busca agora é o botão "Retirada" na
                          alça, logo abaixo. */}
                      {!isDeliveryPhase && (
                        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-purple-600/95 px-3.5 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur">
                          <Package className="w-4 h-4 shrink-0" />
                          Peça o código no balcão
                        </span>
                      )}
                      {/* Nas DUAS fases, não só na entrega: o entregador precisa
                          saber que é pedido em dinheiro ANTES de sair, pra levar
                          troco. Foi a segunda coisa que o Diego notou faltando
                          ("e não apareceu o valor") — ele estava indo ao
                          restaurante, onde o chip ainda não existia. */}
                      {activeDelivery.payment_method === 'cash' && (
                        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-orange-600/95 px-3.5 py-2 text-sm font-bold text-white shadow-xl backdrop-blur">
                          💵 Cobrar {brl(Number(activeDelivery.total_amount || 0))}
                          {Number(activeDelivery.change_for || 0) > Number(activeDelivery.total_amount || 0) && (
                            <span className="font-semibold opacity-90">
                              · troco {brl((Number(activeDelivery.change_for) - Number(activeDelivery.total_amount)))}
                            </span>
                          )}
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
                  {/* ⚠️ `fixed`, NÃO `absolute` — e isso é o conserto de um bug real.
                      Enquanto o painel era absoluto dentro do bloco do mapa, a
                      posição dele dependia da ALTURA DO BLOCO, que é
                      calc(100dvh - 8rem). No WebView do Android o 100dvh
                      reporta a tela inteira, com as barras do sistema: o bloco
                      fica mais alto que a área visível e o fim dele cai atrás
                      da barra de navegação. Com o painel recolhido até a alça,
                      a alça ia junto — o Diego abriu o app e não tinha painel
                      nenhum, nem jeito de chegar na informação.

                      Antes não aparecia porque o painel começava em 62% do
                      bloco, longe do fim; o bug estava lá, só não incomodava.

                      Ancorado na JANELA e logo acima da barra de navegação
                      (56px + safe area), ele não depende mais de o dvh estar
                      certo. z-20 pra ficar acima dos chips do mapa. */}
                  <div className={`fixed inset-x-0 z-20 flex flex-col rounded-t-2xl border-t border-white/60 bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] backdrop-blur-md bottom-[calc(56px+env(safe-area-inset-bottom))] lg:absolute lg:inset-x-0 lg:bottom-0 ${
                    painelAberto ? 'top-[18%] lg:top-[12%]' : 'h-16 lg:h-auto lg:top-[62%]'
                  }`}>
                    {/* A alca AGORA FUNCIONA. Antes era um risquinho decorativo:
                        parecia arrastavel e nao era, entao o conteudo so rolava
                        e rolar num painel baixo parece corte. Prometer um gesto
                        e nao cumprir e pior que nao ter gesto nenhum. */}
                    {/* CONFIRMAR ENTREGA SEM ABRIR O PAINEL.
                        Na porta do cliente, com o pedido na mão e muitas vezes
                        de capacete, dois toques a menos valem mais do que em
                        qualquer outra tela. Antes: puxar o painel, achar o
                        botão no meio de endereço/telefone/chat, tocar. Agora o
                        atalho fica na própria alça.

                        Só na FASE DE ENTREGA. Indo ao restaurante ele não tem
                        o que confirmar, e um botão de fechar entrega ali seria
                        um toque errado esperando acontecer.

                        O botão do painel CONTINUA existindo — este é atalho,
                        não substituto. Quem abriu o painel por outro motivo
                        não deve ter que fechá-lo pra concluir. */}
                    <div className="flex w-full items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setPainelAberto((v) => !v)}
                        aria-expanded={painelAberto}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1 active:bg-gray-50"
                      >
                        <span className="h-1 w-10 rounded-full bg-gray-400" />
                        {/* O TEXTO SOME QUANDO HÁ DOIS BOTÕES.
                            Na fase de entrega a alça carrega "Confirmar entrega"
                            E "Dirigir" — e aí a legenda era espremida até virar
                            "CAR PARA VER TU", que não é texto, é sujeira. A alça
                            (o risquinho) já comunica sozinha que dá pra puxar.
                            Some só onde falta espaço; indo à loja, onde há um
                            botão só, a legenda continua. */}
                        <span className={`truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500 ${
                          isDeliveryPhase ? 'hidden sm:inline' : ''
                        }`}>
                          {painelAberto ? 'tocar para ver o mapa' : 'tocar para ver tudo'}
                        </span>
                      </button>
                      {/* UMA AÇÃO PRINCIPAL POR FASE, e agora as duas fases têm
                          a sua: indo buscar, confirmar a RETIRADA; indo levar,
                          confirmar a ENTREGA. Antes a fase de busca não tinha
                          ação nenhuma aqui — só o código pra mostrar no balcão,
                          porque quem confirmava era o parceiro. */}
                      {!isDeliveryPhase && (
                        <button
                          type="button"
                          onClick={() => pickupFromHere(activeDelivery.id)}
                          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2.5 text-sm font-bold text-white shadow-md active:scale-95"
                        >
                          <Package className="h-4 w-4" />
                          Retirada
                        </button>
                      )}
                      {isDeliveryPhase && (
                        <button
                          type="button"
                          onClick={() => finishFromHere(activeDelivery.id)}
                          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-bold text-white shadow-md active:scale-95"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Confirmar entrega
                        </button>
                      )}
                      {/* DIRIGIR, indo pra loja — o par do "Confirmar entrega".
                          Cada fase tem UMA ação na alça, e é a ação daquela
                          fase: indo buscar, dirigir; indo entregar, confirmar.

                          ⚠️ Aqui esteve o código de retirada, e foi erro meu:
                          ele JÁ aparece no chip roxo em cima do mapa. Repetir o
                          mesmo número em dois lugares da mesma tela não informa
                          duas vezes — só ocupa o lugar da ação que faltava.
                          O Diego apontou no primeiro teste (13/09/2026).

                          Vai pelo mesmo caminho dos botões do card
                          (utils/navegacao): coordenada, não endereço escrito, e
                          `_system` pra sair da WebView e cair no Waze. */}
                      {/* NAS DUAS FASES, e essa foi a correção seguinte.
                          Primeiro ele só existia indo à loja — mas aí, na fase
                          de entrega, a alça só tinha "Confirmar entrega" e a
                          navegação até o cliente ficava só no modal. Tirar o
                          modal (que é o que o Diego pediu) deixaria o caminho
                          de volta sem mapa nenhum.
                          O destino quem escolhe é destinoDaCorrida, pelo status:
                          antes de retirar vai pra loja, depois vai pro cliente. */}
                      <button
                        type="button"
                        onClick={() => {
                          // Push primeiro: ele vira o "voltar ao Inksa" na barra
                          // do sistema enquanto o Waze ocupa a tela.
                          pedirAtalhoDeVolta(activeDelivery.id);
                          const d = destinoDaCorrida(activeDelivery);
                          abrirWaze(d.lat, d.lng, d.endereco, { coordPrecisa: d.coordPrecisa });
                        }}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#00D8FF] px-3 py-2.5 text-sm font-bold text-white shadow-md active:scale-95"
                      >
                        <Navigation className="h-4 w-4" />
                        {/* Só o ícone quando divide a alça com "Confirmar
                            entrega": um caminhão de seta é reconhecível, e
                            dois rótulos longos lado a lado é o que espremia
                            a legenda até cortar. */}
                        {/* A legenda some no celular estreito NAS DUAS FASES:
                            desde que a fase de busca ganhou o botão "Retirada",
                            a alça divide espaço nas duas, não só na entrega. */}
                        <span className="hidden sm:inline">Dirigir</span>
                      </button>
                    </div>
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
                      Entrega ativa {numeroPedido(activeDelivery)}
                    </h3>

                    {/* O número saiu daqui em 20/09/2026 — quem tem o código é o
                        parceiro. No lugar dele, o que o entregador precisa
                        saber pra não chegar no balcão sem entender o passo. */}
                    {!isDeliveryPhase && (
                      <button
                        type="button"
                        onClick={() => pickupFromHere(activeDelivery.id)}
                        className="w-full rounded border border-purple-200 bg-purple-50 p-2 text-left active:bg-purple-100"
                      >
                        <p className="text-xs text-purple-700">Retirada</p>
                        <p className="text-sm font-semibold text-purple-900">
                          Peça o código ao parceiro e toque aqui para confirmar
                        </p>
                      </button>
                    )}

                    {activeDelivery.payment_method === 'cash' && (
                      <div className="bg-orange-50 border border-orange-200 rounded p-2 text-sm font-bold text-orange-700">
                        💵 Cobrar {brl(Number(activeDelivery.total_amount || 0))} em dinheiro
                        {Number(activeDelivery.change_for || 0) > Number(activeDelivery.total_amount || 0) && (
                          <div className="mt-0.5 text-xs font-semibold text-orange-600">
                            Levar troco de {brl(Number(activeDelivery.change_for) - Number(activeDelivery.total_amount))} (cliente vai pagar com {brl(Number(activeDelivery.change_for))})
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 break-words">
                      <span className="font-medium">{activeDelivery.client_name || 'Cliente'}</span>
                      {activeDelivery.delivery_address ? ` — ${activeDelivery.delivery_address}` : ''}
                    </p>

                    {/* Os botoes "Waze" e "Maps" que ficavam aqui SAIRAM (pedido do
                        Diego, 13/09/2026: "aqueles dois waze rota ate na loja e ate o
                        cliente pode tirar"). Eram duplicata do "Dirigir" la em cima e
                        erravam tres coisas que o utils/navegacao ja resolve:
                          - `_blank` NAO sai da WebView: no APK abria o mapa DENTRO do
                            app, onde nao existe navegacao virada a virada;
                          - iam sempre por `?q=<texto>`, fazendo o Waze geocodificar de
                            novo em vez de usar a coordenada quando ela e melhor;
                          - nao disparavam o atalho de volta pro Inksa.
                        O telefone fica: `tel:` com `_self` e o caminho certo. */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => window.open(`tel:${activeDelivery.customer?.phone || ''}`, '_self')}>
                        <Phone className="w-4 h-4" /> <span className="ml-1">Ligar para o cliente</span>
                      </Button>
                    </div>

                    {/* Chat com o cliente direto daqui — antes só dava pra abrir
                        entrando no modal de detalhe, então o entregador nem via
                        que o cliente mandou mensagem. */}
                    {['accepted_by_delivery', 'ready', 'picked_up', 'on_the_way', 'delivering'].includes(activeDelivery.status) && (
                      <button
                        onClick={() => chat.setOpen(true)}
                        className="relative w-full text-sm font-bold text-orange-500 border-2 border-orange-500 bg-white hover:bg-orange-50 rounded-lg py-2 flex items-center justify-center gap-1.5 min-h-[44px]"
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
                {/* ⚠️ QUEBRA EM DUAS LINHAS NO CELULAR, não rolagem lateral.
                    As quatro abas precisam de 418px e o cartão tem 312px numa
                    tela de 360px — sobrava "Em Andamento" cortada e "Concluídas"
                    invisível, sem nada indicando que dava pra arrastar. O
                    `overflow-x-auto` continua como rede pra tela ainda menor.

                    Antes isto quebrava sozinho, por causa de um
                    `.flex { flex-wrap: wrap !important }` global no app.css que
                    saiu em 09/09. A intenção era esta o tempo todo — agora está
                    escrita aqui, onde quem lê o componente enxerga. */}
                <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full sm:w-auto scrollbar-none">
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

      {/* ⚠️ TELA INTEIRA, e não um aviso de canto.
          Quem está com o capacete na mão e o celular no suporte não lê toast.
          Isto é a única mensagem do app que manda a pessoa PARAR — e chegar
          fraco aqui custa a viagem inteira. */}
      {pedidoCancelado && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-9 w-9 text-red-600" />
            </div>
            <h3 className="mb-1 text-xl font-bold text-gray-900">Pedido cancelado</h3>
            <p className="mb-1 text-sm text-gray-600">
              A loja cancelou o pedido {numeroPedido(pedidoCancelado)}.
            </p>
            {/* O nome da loja importa: ele pode estar com mais de uma corrida
                na cabeça, e "pedido cancelado" sozinho não diz qual. */}
            {pedidoCancelado.restaurant_name && (
              <p className="mb-3 text-sm font-semibold text-gray-800">
                {pedidoCancelado.restaurant_name}
              </p>
            )}
            <p className="mb-5 text-base font-bold text-red-700">
              Não precisa mais ir buscar.
            </p>
            <button
              onClick={() => { setPedidoCancelado(null); fetchDeliveries(); }}
              className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white active:scale-95"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* RETIRADA — irmão gêmeo do modal de entrega logo abaixo, de propósito:
          é a mesma interação que o entregador já faz todo dia no fim da
          corrida, agora também no começo. Coisa nova que se parece com coisa
          conhecida não precisa ser aprendida. */}
      {pendingPickupId && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 mx-0 sm:mx-4" style={{ paddingBottom: '1.5rem' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Código de Retirada</h3>
            <p className="text-sm text-gray-500 mb-4">
              Peça o código ao parceiro — ele aparece na tela do pedido, no app dele.
            </p>
            <input
              type="text"
              value={pickupCodeInput}
              onChange={e => setPickupCodeInput(limparCodigo(e.target.value))}
              placeholder="Ex: 4803"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-base font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-400 mb-4"
              onKeyDown={e => { if (e.key === 'Enter') confirmPickup(); }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setPendingPickupId(null); setPickupCodeInput(''); }}
                disabled={pickingUp}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPickup}
                disabled={pickingUp || !codigoCompleto(pickupCodeInput)}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pickingUp ? (<><Loader2 className="h-4 w-4 animate-spin" /> Confirmando...</>) : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingFinishId && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 mx-0 sm:mx-4" style={{ paddingBottom: '1.5rem' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Código de Entrega</h3>
            <p className="text-sm text-gray-500 mb-4">Peça o código do pedido ao cliente para confirmar a entrega.</p>
            <input
              type="text"
              value={finishCode}
              onChange={e => setFinishCode(limparCodigo(e.target.value))}
              placeholder="Ex: 4803"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
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
                disabled={finishing || !codigoCompleto(finishCode)}
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
                <span className="font-bold text-green-600">{brl(Number(cashInfo.voce_recebeu || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sua taxa de entrega</span>
                <span className="font-bold text-blue-600">{brl(Number(cashInfo.sua_taxa || 0))}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm text-gray-600">Você deve à plataforma</span>
                <span className="font-bold text-orange-600">{brl(Number(cashInfo.deve_a_plataforma || 0))}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4 text-center">
              {brl(Number(cashInfo.deve_a_plataforma || 0))} será descontado do seu próximo repasse online.
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
                onClick={() => setPendingReviewOrder(null)}
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
                    // Mesmo caminho de todo o resto do app: `_system` pra sair da
                    // WebView, e coordenada da loja quando existir. Antes isto era
                    // Google Maps com `_blank` e abria dentro do proprio app.
                    const addr = returnOrder.restaurant_address || returnOrder.restaurant?.address || returnOrder.restaurant_name || '';
                    abrirWaze(returnOrder.restaurant_latitude, returnOrder.restaurant_longitude, addr);
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
