// src/pages/MyDeliveriesPage.jsx - VERSÃO CORRIGIDA E FUNCIONAL

import React, { useState, useEffect, useMemo } from 'react';
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
    Phone,
    Eye,
    EyeOff,
    ExternalLink,
    Route,
    Package
} from 'lucide-react';

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

    useEffect(() => {
        const fetchDeliveries = async () => {
            try {
                setPageLoading(true);
                
                // ✅ CORREÇÃO 1: Buscar estatísticas do dashboard
                const statsData = await DeliveryService.getDashboardStats();
                const myActiveOrders = statsData.activeOrders || [];
                setMyDeliveries(myActiveOrders);
                
                // ✅ CORREÇÃO 2: Buscar pedidos disponíveis com TOKEN CORRETO
                try {
                    const token = localStorage.getItem('token'); // ✅ NOME CORRETO DO TOKEN
                    
                    if (!token) {
                        console.error("❌ Token não encontrado no localStorage");
                        return;
                    }
                    
                    const apiUrl = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
                    console.log('🔍 Buscando pedidos disponíveis em:', `${apiUrl}/api/orders/available`);
                    
                    const response = await fetch(`${apiUrl}/api/orders/available`, {
                        headers: {
                            'Authorization': `Bearer ${token}`, // ✅ USANDO O TOKEN CORRETO
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    console.log('📊 Status da resposta:', response.status);
                    
                    if (response.ok) {
                        const availableData = await response.json();
                        console.log('✅ Pedidos disponíveis recebidos:', availableData);
                        console.log('📦 Total de pedidos disponíveis:', availableData.length);
                        setAvailableOrders(availableData || []);
                    } else {
                        // ✅ CORREÇÃO 3: Melhor tratamento de erro
                        const errorText = await response.text();
                        console.error('❌ Erro ao buscar pedidos disponíveis:', {
                            status: response.status,
                            statusText: response.statusText,
                            error: errorText
                        });
                        
                        // Se for erro 401 (não autorizado), limpar token
                        if (response.status === 401) {
                            console.error('🔒 Token inválido ou expirado');
                            localStorage.removeItem('token');
                        }
                    }
                } catch (error) {
                    console.error("❌ Erro de rede ao buscar pedidos disponíveis:", error);
                }
                
                // Definir entrega ativa (primeira em andamento)
                const ongoingDelivery = myActiveOrders.find(d => 
                    ['pending', 'accepted', 'picked_up', 'on_the_way', 'ready', 'preparing'].includes(d.status)
                );
                setActiveDelivery(ongoingDelivery);
                
            } catch (error) {
                console.error("❌ Erro geral ao buscar as entregas:", error);
            } finally {
                setPageLoading(false);
            }
        };
        
        fetchDeliveries();
    }, []);

    // ✅ CORREÇÃO 4: Filtrar baseado no filtro ativo
    const filteredDeliveries = useMemo(() => {
        if (activeFilter === 'available') {
            return availableOrders;
        }
        
        if (activeFilter === 'all') {
            return myDeliveries;
        }
        
        const ongoingStatus = ['pending', 'accepted', 'picked_up', 'on_the_way', 'ready', 'preparing'];
        
        if (activeFilter === 'ongoing') {
            return myDeliveries.filter(d => ongoingStatus.includes(d.status));
        }
        
        if (activeFilter === 'delivered') {
            return myDeliveries.filter(d => d.status === 'delivered');
        }
        
        return myDeliveries;
    }, [availableOrders, myDeliveries, activeFilter]);

    const handleFilterClick = (filter) => {
        setIsFiltering(true);
        setActiveFilter(filter);
        setTimeout(() => setIsFiltering(false), 300);
    };
    
    const handleUpdateStatus = (orderId, newStatus) => {
        setMyDeliveries(currentDeliveries =>
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
            // Se for um pedido disponível, não tem detalhes ainda
            if (activeFilter === 'available') {
                setSelectedOrder(order);
            } else {
                const orderDetails = await DeliveryService.getOrderDetail(order.id);
                setSelectedOrder(orderDetails);
            }
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
                                    
                                    {!activeDelivery ? (
                                        <div>
                                            <p className="text-gray-500 mb-4">Nenhuma entrega ativa no momento</p>
                                            <p className="text-sm text-gray-400">O mapa será exibido quando houver entregas em andamento</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-gray-500 mb-4">
                                                {showMap ? 'Mapa em desenvolvimento' : 'Clique no ícone do olho para ver o mapa'}
                                            </p>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border max-w-sm mx-auto">
                                                <h3 className="font-semibold mb-2">Entrega Ativa #{activeDelivery.id}</h3>
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
                                                        <ExternalLink className="w-4 h-4 mr-1" />
                                                        Waze
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
                                        <Package className="w-4 h-4 mr-1" />
                                        Disponíveis
                                        {availableOrders.length > 0 && (
                                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                {availableOrders.length}
                                            </span>
                                        )}
                                    </Button>
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
                    onUpdateStatus={handleUpdateStatus}
                    isAvailable={activeFilter === 'available'}
                />
            )}
        </div>
    );
}
