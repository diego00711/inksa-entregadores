// src/pages/MyDeliveriesPage.jsx - VERSÃO SIMPLIFICADA FINAL

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProfile } from '../context/DeliveryProfileContext.jsx'; 
import DeliveryService from '../services/deliveryService.js';
import { DeliveryCard } from '../components/DeliveryCard.jsx'; 
import { DeliveryDetailModal } from '../components/DeliveryDetailModal.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '../components/Header.jsx';
import { 
    Loader2, 
    PackageSearch, 
    MapPin, 
    Navigation, 
    Timer,
    Phone,
    Eye,
    EyeOff,
    ExternalLink,
    Route
} from 'lucide-react';

export function MyDeliveriesPage() {
    const { loading: profileLoading } = useProfile();
    const [deliveries, setDeliveries] = useState([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [activeDelivery, setActiveDelivery] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [userLocation, setUserLocation] = useState(null);

    useEffect(() => {
        const fetchDeliveries = async () => {
            try {
                setPageLoading(true);
                const data = await DeliveryService.getDeliveriesByStatus('all'); 
                setDeliveries(data);
                
                // Definir entrega ativa (primeira em andamento)
                const ongoingDelivery = data.find(d => 
                    ['accepted', 'picked_up', 'on_the_way', 'Pronto para Entrega'].includes(d.status)
                );
                setActiveDelivery(ongoingDelivery);
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
        
        if (activeDelivery && activeDelivery.id === orderId) {
            setActiveDelivery(prev => ({ ...prev, status: newStatus }));
        }
        
        if (isModalOpen) {
            setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
        }
    };
    
    const handleCardClick = async (order) => {
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

    const handleDeliverySelect = (delivery) => {
        setActiveDelivery(delivery);
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
                    {/* Seção do Mapa */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg font-bold flex items-center">
                                    <MapPin className="w-5 h-5 mr-2" />
                                    Mapa de Entregas
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowMap(!showMap)}
                                >
                                    {showMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 relative" style={{ height: '500px' }}>
                            <div className="h-full flex items-center justify-center bg-gray-50">
                                <div className="text-center">
                                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">
                                        {showMap ? 'Mapa em desenvolvimento' : 'Clique no ícone do olho para ver o mapa'}
                                    </p>
                                    {activeDelivery && (
                                        <div className="bg-white p-4 rounded-lg shadow-sm border max-w-sm mx-auto">
                                            <h3 className="font-semibold mb-2">Entrega Ativa #{activeDelivery.id}</h3>
                                            <p className="text-sm text-gray-600 mb-3">
                                                {activeDelivery.customer?.name || 'Cliente não informado'}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="flex-1"
                                                    onClick={() => {
                                                        const address = activeDelivery.deliveryAddress?.street + ', ' + activeDelivery.deliveryAddress?.city;
                                                        window.open(`https://waze.com/ul?q=${encodeURIComponent(address)}`, '_blank');
                                                    }}
                                                >
                                                    <ExternalLink className="w-4 h-4 mr-1" />
                                                    Waze
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="flex-1"
                                                    onClick={() => {
                                                        const address = activeDelivery.deliveryAddress?.street + ', ' + activeDelivery.deliveryAddress?.city;
                                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
                                                    }}
                                                >
                                                    <Route className="w-4 h-4 mr-1" />
                                                    Maps
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => window.open(`tel:${activeDelivery.customer?.phone}`, '_self')}
                                                >
                                                    <Phone className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Seção das Entregas */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <CardTitle className="text-lg font-bold">Histórico de Entregas</CardTitle>
                                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                                    <Button size="sm" variant={activeFilter === 'all' ? 'default' : 'ghost'} onClick={() => handleFilterClick('all')}>Todas</Button>
                                    <Button size="sm" variant={activeFilter === 'ongoing' ? 'default' : 'ghost'} onClick={() => handleFilterClick('ongoing')}>Em Andamento</Button>
                                    <Button size="sm" variant={activeFilter === 'delivered' ? 'default' : 'ghost'} onClick={() => handleFilterClick('delivered')}>Concluídas</Button>
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
                                    {filteredDeliveries.map(delivery => (
                                        <div 
                                            key={delivery.id} 
                                            className={`cursor-pointer transition-all ${
                                                activeDelivery && activeDelivery.id === delivery.id 
                                                    ? 'ring-2 ring-primary' 
                                                    : ''
                                            }`}
                                            onClick={() => handleDeliverySelect(delivery)}
                                        >
                                            <DeliveryCard 
                                                delivery={delivery} 
                                                onClick={() => handleCardClick(delivery)} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-4 h-full">
                                    <PackageSearch className="w-16 h-16 text-muted-foreground/50" />
                                    <h3 className="text-xl font-semibold">Nenhuma entrega encontrada</h3>
                                    <p className="text-muted-foreground text-center">Tente selecionar outro filtro ou aguarde por novas oportunidades.</p>
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
                />
            )}
        </div>
    );
}
