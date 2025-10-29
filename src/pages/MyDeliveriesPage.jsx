// src/pages/MyDeliveriesPage.jsx
// ✅ Mobile-first • Polling inteligente • Pickup Code garantido

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import DeliveryService from '../services/deliveryService.js';
import { DeliveryCard } from '../components/DeliveryCard.jsx';
import { DeliveryDetailModal } from '../components/DeliveryDetailModal.jsx';
import { Header } from '../components/Header.jsx';
import { useToast } from '../context/ToastContext.jsx';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
  Loader2,
  PackageSearch,
  MapPin,
  Phone,
  Eye,
  EyeOff,
  ExternalLink,
  Route,
  Package,
  Copy,
  CheckCircle2,
} from 'lucide-react';

/* -------------------------- Constantes de Polling -------------------------- */
const POLL_ACTIVE_MS = 15000;    // app em foco
const POLL_INACTIVE_MS = 45000;  // aba em segundo plano

/* ------------------------ Helpers de autenticação/API ---------------------- */
const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
const getToken = () =>
  localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token') || '';

async function fetchWithAuth(path, init = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} – ${errText || res.statusText}`);
  }
  return res.json();
}

/* ------------------------------- Componente -------------------------------- */
export function MyDeliveriesPage() {
  const { loading: profileLoading } = useProfile();
  const addToast = useToast();

  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState('available'); // available | all | ongoing | delivered
  const [isFiltering, setIsFiltering] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [activeDelivery, setActiveDelivery] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const pageVisibleRef = useRef(true);

  /* ------------------------------ Helpers UI ------------------------------- */
  const ongoingStatus = useMemo(
    () => ['pending', 'accepted', 'accepted_by_delivery', 'picked_up', 'on_the_way', 'ready', 'preparing', 'delivering'],
    []
  );

  const handleFilterClick = (filter) => {
    setIsFiltering(true);
    setActiveFilter(filter);
    setTimeout(() => setIsFiltering(false), 250);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('Código copiado ✅', 'success');
    } catch {
      addToast('Não foi possível copiar o código', 'warning');
    }
  };

  /* ------------------------- Enriquecimento de pedido ---------------------- */
  const hydratePickupCodeIfNeeded = useCallback(async (order) => {
    // Somente busca /:id se formos exibir código (status “accepted_by_delivery” ou “ready”) e ele não vier no objeto
    if (order?.pickup_code || !['accepted_by_delivery', 'ready'].includes(order?.status)) {
      return order;
    }
    try {
      const full = await fetchWithAuth(`/api/orders/${order.id}`);
      return { ...order, pickup_code: full?.pickup_code };
    } catch {
      return order;
    }
  }, []);

  /* -------------------------- Carga principal (poll) ----------------------- */
  const fetchEverything = useCallback(async () => {
    try {
      // stats do entregador (traz activeOrders, is_available etc.)
      // e pedidos disponíveis em paralelo
      const [statsRaw, availableRaw] = await Promise.allSettled([
        DeliveryService.getDashboardStats(),
        fetchWithAuth('/api/orders/available'),
      ]);

      const statsData = statsRaw.status === 'fulfilled'
        ? (statsRaw.value?.data || statsRaw.value || {})
        : {};

      const available = availableRaw.status === 'fulfilled'
        ? (Array.isArray(availableRaw.value) ? availableRaw.value : [])
        : [];

      // garantir pickup_code nos ativos (somente quando necessário)
      const active = Array.isArray(statsData.activeOrders) ? statsData.activeOrders : [];
      const activeHydrated = await Promise.all(active.map(hydratePickupCodeIfNeeded));

      setMyDeliveries(activeHydrated);
      setAvailableOrders(available);

      // definir a entrega “em andamento” para o box do mapa
      const current = activeHydrated.find((d) => ongoingStatus.includes(d.status)) || null;
      setActiveDelivery(current);

      setLastUpdated(new Date());
    } catch (err) {
      // silencioso durante polls; alerta apenas na primeira carga
      if (pageLoading) addToast('Falha ao atualizar entregas.', 'error');
    } finally {
      setPageLoading(false);
    }
  }, [hydratePickupCodeIfNeeded, ongoingStatus, pageLoading, addToast]);

  /* --------------------------- Inicia/para polling ------------------------- */
  const startPolling = useCallback(() => {
    const interval = pageVisibleRef.current ? POLL_ACTIVE_MS : POLL_INACTIVE_MS;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchEverything, interval);
  }, [fetchEverything]);

  useEffect(() => {
    // primeira carga
    if (!profileLoading) {
      fetchEverything();
      startPolling();
    }
    return () => clearInterval(intervalRef.current);
  }, [profileLoading, fetchEverything, startPolling]);

  useEffect(() => {
    // pausa/adapta quando a aba muda de visibilidade
    const onVis = () => {
      pageVisibleRef.current = document.visibilityState === 'visible';
      startPolling();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [startPolling]);

  /* --------------------------- Interação com modal ------------------------- */
  const handleCardClick = async (order) => {
    setIsModalOpen(true);
    setIsModalLoading(true);
    try {
      if (activeFilter === 'available') {
        setSelectedOrder(order);
      } else {
        const detail = await DeliveryService.getOrderDetail(order.id);
        setSelectedOrder(detail);
      }
    } catch (e) {
      addToast('Erro ao abrir detalhes do pedido', 'error');
      setIsModalOpen(false);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleDeliverySelect = (delivery) => setActiveDelivery(delivery);

  const handleUpdateStatus = (orderId, newStatus) => {
    setMyDeliveries((curr) => curr.map((d) => (d.id === orderId ? { ...d, status: newStatus } : d)));
    setAvailableOrders((curr) => curr.map((d) => (d.id === orderId ? { ...d, status: newStatus } : d)));
    if (activeDelivery?.id === orderId) setActiveDelivery((prev) => ({ ...prev, status: newStatus }));
    if (isModalOpen) setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
  };

  /* -------------------------------- Filtros -------------------------------- */
  const filteredDeliveries = useMemo(() => {
    switch (activeFilter) {
      case 'available':
        return availableOrders;
      case 'all':
        return myDeliveries;
      case 'ongoing':
        return myDeliveries.filter((d) => ongoingStatus.includes(d.status));
      case 'delivered':
        return myDeliveries.filter((d) => d.status === 'delivered');
      default:
        return myDeliveries;
    }
  }, [activeFilter, availableOrders, myDeliveries, ongoingStatus]);

  /* ------------------------------- Loading UI ------------------------------ */
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

  /* --------------------------------- Render -------------------------------- */
  const deliveryName = activeDelivery?.customer?.name || activeDelivery?.client_name || 'Cliente';
  const deliveryAddress =
    activeDelivery?.deliveryAddress?.street ||
    activeDelivery?.delivery_address ||
    '';

  return (
    <div className="flex-1 flex flex-col">
      <Header />
      <main className="flex-1 p-3 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 h-full">
          {/* ---------------------------- Mapa / Entrega ativa ---------------------------- */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg font-bold flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Mapa de Entregas
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {lastUpdated && <span>Atualizado {lastUpdated.toLocaleTimeString('pt-BR')}</span>}
                  <Button variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
                    {showMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="h-[360px] md:h-[480px] flex items-center justify-center bg-gray-50">
                <div className="w-full px-3">
                  {!activeDelivery ? (
                    <div className="text-center">
                      <MapPin className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 mb-1">Nenhuma entrega ativa no momento</p>
                      <p className="text-xs text-gray-400">
                        O mapa será exibido quando houver entregas em andamento.
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto">
                      <div className="bg-white p-4 rounded-xl shadow-sm border">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">
                            Entrega Ativa #{activeDelivery.id?.substring(0, 8)}…
                          </h3>
                          {['accepted_by_delivery', 'ready'].includes(activeDelivery.status) &&
                            !!activeDelivery.pickup_code && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="gap-1"
                                onClick={() => copyToClipboard(activeDelivery.pickup_code)}
                                title="Copiar código"
                              >
                                <Copy className="w-4 h-4" />
                                {activeDelivery.pickup_code}
                              </Button>
                            )}
                        </div>

                        <p className="text-sm text-gray-600 mt-2">{deliveryName}</p>

                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              window.open(
                                `https://waze.com/ul?q=${encodeURIComponent(deliveryAddress)}`,
                                '_blank'
                              )
                            }
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Waze
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                  deliveryAddress
                                )}`,
                                '_blank'
                              )
                            }
                          >
                            <Route className="w-4 h-4 mr-1" />
                            Maps
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const phone =
                                activeDelivery?.customer?.phone ||
                                activeDelivery?.client_phone ||
                                '';
                              if (phone) window.open(`tel:${phone}`, '_self');
                              else addToast('Telefone indisponível', 'warning');
                            }}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        </div>

                        {showMap ? (
                          <div className="mt-3 text-xs text-gray-400">
                            (Mapa embutido opcional — mantido desativado para desempenho em
                            mobile. Abrir via Waze/Maps acima.)
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-gray-400">
                            Toque no olho para visualizar o mapa (opcional).
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------ Lista de entregas ----------------------------- */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                <CardTitle className="text-base md:text-lg font-bold">
                  {activeFilter === 'available' ? 'Pedidos Disponíveis' : 'Minhas Entregas'}
                </CardTitle>

                {/* Pills roláveis no mobile */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                  <Button
                    size="sm"
                    variant={activeFilter === 'available' ? 'default' : 'ghost'}
                    onClick={() => handleFilterClick('available')}
                    className="whitespace-nowrap"
                  >
                    <Package className="w-4 h-4 mr-1" />
                    Disponíveis
                    {availableOrders.length > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {availableOrders.length}
                      </span>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={activeFilter === 'all' ? 'default' : 'ghost'}
                    onClick={() => handleFilterClick('all')}
                  >
                    Todas
                  </Button>
                  <Button
                    size="sm"
                    variant={activeFilter === 'ongoing' ? 'default' : 'ghost'}
                    onClick={() => handleFilterClick('ongoing')}
                  >
                    Em Andamento
                  </Button>
                  <Button
                    size="sm"
                    variant={activeFilter === 'delivered' ? 'default' : 'ghost'}
                    onClick={() => handleFilterClick('delivered')}
                  >
                    Concluídas
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-3" style={{ height: '420px', overflowY: 'auto' }}>
              {isFiltering ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredDeliveries.length > 0 ? (
                <div className="space-y-3">
                  {filteredDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className={`cursor-pointer transition-all ${
                        activeDelivery?.id === delivery.id ? 'ring-2 ring-primary' : ''
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
                <div className="flex flex-col items-center justify-center gap-3 h-full text-center">
                  <PackageSearch className="w-14 h-14 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold">Nenhuma entrega encontrada</h3>
                  <p className="text-muted-foreground text-sm">
                    {activeFilter === 'available'
                      ? 'Não há pedidos disponíveis no momento. Aguarde por novas oportunidades!'
                      : 'Tente outro filtro ou aguarde por novas entregas.'}
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
          onUpdateStatus={handleUpdateStatus}
          isAvailable={activeFilter === 'available'}
        />
      )}
    </div>
  );
}
