// src/pages/MyDeliveriesPage.jsx – VERSÃO COMPLETA (finalização com delivery_code)

import React, { useState, useEffect, useMemo } from 'react';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import DeliveryService from '../services/deliveryService.js';
import { DeliveryCard } from '../components/DeliveryCard.jsx';
import { DeliveryDetailModal } from '../components/DeliveryDetailModal.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '../components/Header.jsx';
import { Loader2, PackageSearch, MapPin, Phone, Eye, EyeOff, ExternalLink, Route, Package } from 'lucide-react';
import { acceptDelivery, completeDelivery } from '../services/orderService';

export function MyDeliveriesPage() {
  const { loading: profileLoading } = useProfile();
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

  const fetchOrderWithPickupCode = async (orderId) => {
    try {
      const token = localStorage.getItem('deliveryAuthToken') || localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
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

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setPageLoading(true);
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
          const apiUrl = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
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
      } finally {
        setPageLoading(false);
      }
    };

    fetchDeliveries();
    const id = setInterval(fetchDeliveries, 30000);
    return () => clearInterval(id);
  }, []);

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

  // Exemplo de finalizar nessa página (se você chamar daqui):
  const finishFromHere = async (orderId) => {
    const code = window.prompt('Informe o CÓDIGO DE ENTREGA do cliente (4 letras):');
    if (!code) return;
    const deliveryCode = String(code).trim().toUpperCase();
    if (deliveryCode.length < 3) return;

    try {
      await completeDelivery(orderId, deliveryCode);
      handleUpdateStatus(orderId, 'delivered');
    } catch (e) {
      console.error('Erro ao completar entrega:', e);
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
      <Header />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
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
            <CardContent className="p-0 relative" style={{ height: '500px' }}>
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
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg overflow-x-auto">
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

            <CardContent className="pt-4" style={{ height: '420px', overflowY: 'auto' }}>
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
    </div>
  );
}
