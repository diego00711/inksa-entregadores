// src/pages/MyDeliveriesPage.jsx (VERSÃO CORRIGIDA)

import React, { useState, useEffect, useMemo } from 'react';
import { useProfile } from '../context/DeliveryProfileContext.jsx'; 
import DeliveryService from '../services/deliveryService.js';
import { DeliveryCard } from '../components/DeliveryCard.jsx'; 
import { DeliveryDetailModal } from '../components/DeliveryDetailModal.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '../components/Header.jsx';
import { Loader2, PackageSearch } from 'lucide-react';

export function MyDeliveriesPage() {
    const { loading: profileLoading } = useProfile();
    const [deliveries, setDeliveries] = useState([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);

    useEffect(() => {
        const fetchDeliveries = async () => {
            try {
                setPageLoading(true);
                const data = await DeliveryService.getDeliveriesByStatus('all'); 
                setDeliveries(data);
            } catch (error) {
                console.error("Erro ao buscar as entregas:", error);
            } finally {
                setPageLoading(false);
            }
        };
        fetchDeliveries();
    }, []);

    const filteredDeliveries = useMemo(() => {
        if (activeFilter === 'all') return deliveries;
        const ongoingStatus = ['accepted', 'picked_up', 'on_the_way', 'Pronto para Entrega'];
        if (activeFilter === 'ongoing') {
            return deliveries.filter(d => ongoingStatus.includes(d.status));
        }
        if (activeFilter === 'delivered') {
            return deliveries.filter(d => d.status === 'delivered' || d.status === 'Entregue');
        }
        return deliveries;
    }, [deliveries, activeFilter]);

    const handleFilterClick = (filter) => {
        setIsFiltering(true);
        setActiveFilter(filter);
        setTimeout(() => setIsFiltering(false), 300);
    };
    
    const handleUpdateStatus = (orderId, newStatus) => {
      setDeliveries(currentDeliveries =>
        currentDeliveries.map(d =>
          d.id === orderId ? { ...d, status: newStatus } : d
        )
      );
      if (isModalOpen) {
        // LINHA CORRIGIDA AQUI
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    };
    
    const handleCardClick = async (order) => {
        console.log("Dados do Pedido Clicado:", order);
        setIsModalOpen(true);
        setIsModalLoading(true);
        try {
            const orderDetails = await DeliveryService.getOrderDetail(order.id);
            setSelectedOrder(orderDetails);
        } catch (error) {
            console.error("Erro ao buscar detalhes do pedido:", error);
            setIsModalOpen(false);
        } finally {
            setIsModalLoading(false);
        }
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
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
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle className="text-2xl font-bold">Meu Histórico de Entregas</CardTitle>
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                            <Button size="sm" variant={activeFilter === 'all' ? 'default' : 'ghost'} onClick={() => handleFilterClick('all')}>Todas</Button>
                            <Button size="sm" variant={activeFilter === 'ongoing' ? 'default' : 'ghost'} onClick={() => handleFilterClick('ongoing')}>Em Andamento</Button>
                            <Button size="sm" variant={activeFilter === 'delivered' ? 'default' : 'ghost'} onClick={() => handleFilterClick('delivered')}>Concluídas</Button>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 min-h-[300px]">
                    {isFiltering ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filteredDeliveries.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDeliveries.map(delivery => (
                          <DeliveryCard key={delivery.id} delivery={delivery} onClick={() => handleCardClick(delivery)} />
                        ))}
                      </div>
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center gap-4 h-full">
                          <PackageSearch className="w-16 h-16 text-muted-foreground/50" />
                          <h3 className="text-xl font-semibold">Nenhuma entrega encontrada</h3>
                          <p className="text-muted-foreground text-center">Tente selecionar outro filtro ou aguarde por novas oportunidades.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
            </main>
            {isModalOpen && (
                <DeliveryDetailModal
                    order={selectedOrder}
                    onClose={handleCloseModal}
                    isLoading={isModalLoading}
                    onUpdateStatus={handleUpdateStatus}
                />
            )}
        </div>
    );
}