// src/pages/MyDeliveriesPage.jsx – VERSÃO COMPLETA (finalização com delivery_code)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import DeliveryService from '../services/deliveryService.js';
import { DeliveryCard } from '../components/DeliveryCard.jsx';
import { DeliveryDetailModal } from '../components/DeliveryDetailModal.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '../components/Header.jsx';
import { Loader2, PackageSearch, MapPin, Phone, Eye, EyeOff, ExternalLink, Route, Package, AlertTriangle } from 'lucide-react';
import { acceptDelivery, completeDelivery, reportIncident, confirmReturn } from '../services/orderService';
import ReportIncidentModal from '../components/ReportIncidentModal.jsx';
import { DELIVERY_API_URL } from '../services/api';
import { useToast } from '../context/ToastContext.jsx';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

export function MyDeliveriesPage() {
  const { loading: profileLoading } = useProfile();
  const addToast = useToast();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('available');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [pendingFinishId, setPendingFinishId] = useState(null);
  const [finishCode, setFinishCode] = useState('');
  const [incidentOrderId, setIncidentOrderId] = useState(null);
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [confirmingReturn, setConfirmingReturn] = useState(false);

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

  const fetchDeliveries = useCallback(async () => {
    setPageLoading(true);
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
      try {
        const token = localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token');
        const apiUrl = DELIVERY_API_URL;
        const resp = await fetch(`${apiUrl}/api/orders/available`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        setAvailableOrders(resp.ok ? await resp.json() : []);
      } catch (e) {
        console.error('Erro ao buscar disponíveis:', e);
      }

      // quais contam como “em andamento”
      const ongoing = withPickup.find((d) =>
        ['pending', 'accepted', 'accepted_by_delivery', 'picked_up', 'on_the_way', 'ready', 'preparing', 'delivering'].includes(d.status)
      );
      setActiveDelivery(ongoing);
    } catch (err) {
      console.error('Erro ao carregar entregas:', err);
      addToast(err?.message || 'Não foi possível carregar as entregas.', 'error');
    } finally {
      setPageLoading(false);
    }
  }, [addToast]);

  const { pulling, refreshing } = usePullToRefresh(fetchDeliveries);

  useEffect(() => {
    fetchDeliveries();
    const id = setInterval(fetchDeliveries, 30000);
    return () => clearInterval(id);
  }, [fetchDeliveries]);

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
    if (activeDelivery?.id === orderId) setActiveDelivery((prev) => ({ ...prev, status: newStatus }));
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

  const confirmFinish = async () => {
    const deliveryCode = String(finishCode).trim().toUpperCase();
    if (deliveryCode.length < 3) return;
    try {
      await completeDelivery(pendingFinishId, deliveryCode);
      handleUpdateStatus(pendingFinishId, 'delivered');
      setPendingFinishId(null);
      setFinishCode('');
      addToast('Entrega concluída com sucesso!', 'success');
    } catch (e) {
      console.error('Erro ao completar entrega:', e);
      addToast(e?.message || 'Erro ao confirmar entrega. Verifique o código e tente novamente.', 'error');
    }
  };

  const handleReportIncident = async ({ reason, notes, contactAttempts, outcome }) => {
    if (!incidentOrderId) return;
    setIncidentSubmitting(true);
    const orderForReturn = activeDelivery; // captura antes de limpar
    try {
      await reportIncident(incidentOrderId, { reason, notes, contactAttempts, outcome });
      handleUpdateStatus(incidentOrderId, 'delivery_failed');
      setIncidentOrderId(null);
      addToast('Ocorrência registrada.', 'success');
      // Padrão iFood: se for devolver, guia o entregador até o restaurante
      if (outcome === 'return_to_restaurant' && orderForReturn) {
        setReturnOrder(orderForReturn);
      } else {
        setActiveDelivery(null);
      }
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

  return (
    <div className="flex-1 flex flex-col">
      {(pulling || refreshing) && (
        <div className="flex justify-center py-3">
          <div className="w-6 h-6 border-2 border-[#FF6F00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <Header />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full">
          {/* MAPA / CARTÃO DA ENTREGA ATIVA (mantido) */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold flex items-center">
                  <MapPin className="w-5 h-5 mr-2" /> Mapa de Entregas
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)}>
                  {showMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative" style={{ height: '280px' }}>
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  {!activeDelivery ? (
                    <>
                      <p className="text-gray-500 mb-4">Nenhuma entrega ativa no momento</p>
                      <p className="text-sm text-gray-400">O mapa será exibido quando houver entregas em andamento</p>
                    </>
                  ) : (
                    <div>
                      <p className="text-gray-500 mb-4">
                        {showMap ? 'Mapa em desenvolvimento' : 'Clique no ícone do olho para ver o mapa'}
                      </p>
                      <div className="bg-white p-4 rounded-lg shadow-sm border max-w-sm mx-auto">
                        <h3 className="font-semibold mb-2">Entrega Ativa #{activeDelivery.id.substring(0, 8)}...</h3>

                        {activeDelivery.pickup_code && (
                          <div className="mb-3 bg-purple-50 p-2 rounded border border-purple-200">
                            <p className="text-xs text-purple-700 mb-1">Código de Retirada:</p>
                            <p className="text-lg font-bold text-purple-800 tracking-widest">{activeDelivery.pickup_code}</p>
                          </div>
                        )}

                        <p className="text-sm text-gray-600 mb-3">
                          {activeDelivery.customer?.name || activeDelivery.client_name || 'Cliente não informado'}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              const address = activeDelivery.deliveryAddress?.street || activeDelivery.delivery_address;
                              window.open(`https://waze.com/ul?q=${encodeURIComponent(address)}`, '_blank');
                            }}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" /> Waze
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              const address = activeDelivery.deliveryAddress?.street || activeDelivery.delivery_address;
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
                            }}
                          >
                            <Route className="w-4 h-4 mr-1" /> Maps
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.open(`tel:${activeDelivery.customer?.phone}`, '_self')}>
                            <Phone className="w-4 w-4" />
                          </Button>
                        </div>
                        <button
                          onClick={() => setIncidentOrderId(activeDelivery.id)}
                          className="mt-3 w-full text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg py-2 flex items-center justify-center gap-1.5 min-h-[44px]"
                        >
                          <AlertTriangle className="w-4 h-4" /> Não consegui entregar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
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

      {pendingFinishId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 mx-0 sm:mx-4">
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
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFinish}
                disabled={finishCode.trim().length < 3}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportIncidentModal
        isOpen={!!incidentOrderId}
        submitting={incidentSubmitting}
        onClose={() => setIncidentOrderId(null)}
        onConfirm={handleReportIncident}
      />

      {/* Fluxo guiado de devolução ao restaurante (padrão iFood) */}
      {returnOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6">
            <div className="text-center mb-3">
              <div className="text-4xl mb-2">🔁</div>
              <h3 className="text-lg font-bold text-gray-800">Devolva o pedido ao restaurante</h3>
              <p className="text-sm text-gray-500 mt-1">Leve o pedido de volta ao estabelecimento e confirme abaixo.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
              <p className="font-semibold text-gray-800">{returnOrder.restaurant_name || returnOrder.restaurant?.name || 'Restaurante'}</p>
              <p className="text-gray-500">{returnOrder.restaurant_address || returnOrder.restaurant?.address || ''}</p>
            </div>
            <button
              onClick={() => {
                const addr = returnOrder.restaurant_address || returnOrder.restaurant?.address || returnOrder.restaurant_name || '';
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, '_blank');
              }}
              className="w-full mb-2 min-h-[44px] py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Route className="w-4 h-4" /> Rota até o restaurante
            </button>
            <button
              onClick={handleConfirmReturn}
              disabled={confirmingReturn}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {confirmingReturn && <Loader2 className="w-4 h-4 animate-spin" />} Confirmei a devolução
            </button>
            <button onClick={() => { setReturnOrder(null); setActiveDelivery(null); }} className="w-full mt-2 text-xs text-gray-400">
              Confirmar depois
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
