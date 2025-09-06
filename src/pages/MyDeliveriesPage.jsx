// src/pages/MyDeliveriesPage.jsx (VERSÃO COM MAPA E WAZE)

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

// Componente do Mapa
const DeliveryMap = ({ deliveries, activeDelivery, onDeliverySelect, userLocation }) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const [userMarker, setUserMarker] = useState(null);
    const [deliveryMarkers, setDeliveryMarkers] = useState([]);

    useEffect(() => {
        // Inicializar mapa Leaflet
        if (!map && mapRef.current) {
            const L = window.L;
            const newMap = L.map(mapRef.current).setView([-27.0, -51.0], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(newMap);
            
            setMap(newMap);
        }
        
        return () => {
            if (map) {
                map.remove();
            }
        };
    }, []);

    // Atualizar localização do usuário
    useEffect(() => {
        if (map && userLocation) {
            if (userMarker) {
                userMarker.setLatLng([userLocation.lat, userLocation.lng]);
            } else {
                const L = window.L;
                const marker = L.marker([userLocation.lat, userLocation.lng], {
                    icon: L.divIcon({
                        className: 'user-location-marker',
                        html: '<div style="background: #3B82F6; border: 3px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
                        iconSize: [16, 16]
                    })
                }).addTo(map);
                setUserMarker(marker);
            }
            map.setView([userLocation.lat, userLocation.lng], 15);
        }
    }, [map, userLocation, userMarker]);

    // Adicionar marcadores das entregas
    useEffect(() => {
        if (map && deliveries) {
            // Limpar marcadores existentes
            deliveryMarkers.forEach(marker => map.removeLayer(marker));
            
            const L = window.L;
            const newMarkers = deliveries
                .filter(delivery => delivery.deliveryAddress && delivery.deliveryAddress.latitude)
                .map(delivery => {
                    const isActive = activeDelivery && activeDelivery.id === delivery.id;
                    const statusColor = getStatusColor(delivery.status);
                    
                    const marker = L.marker([
                        delivery.deliveryAddress.latitude, 
                        delivery.deliveryAddress.longitude
                    ], {
                        icon: L.divIcon({
                            className: 'delivery-marker',
                            html: `<div style="background: ${statusColor}; border: 3px solid white; border-radius: 50%; width: ${isActive ? 24 : 20}px; height: ${isActive ? 24 : 20}px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">${delivery.id}</div>`,
                            iconSize: [isActive ? 24 : 20, isActive ? 24 : 20]
                        })
                    }).addTo(map);
                    
                    marker.on('click', () => onDeliverySelect(delivery));
                    
                    return marker;
                });
            
            setDeliveryMarkers(newMarkers);
        }
    }, [map, deliveries, activeDelivery, deliveryMarkers, onDeliverySelect]);

    return (
        <div className="relative h-full w-full">
            <div ref={mapRef} className="h-full w-full rounded-lg" />
            {!map && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-2">Carregando mapa...</span>
                </div>
            )}
        </div>
    );
};

// Função para obter cor baseada no status
const getStatusColor = (status) => {
    const colors = {
        'pending': '#9CA3AF',
        'accepted': '#3B82F6', 
        'picked_up': '#F59E0B',
        'on_the_way': '#8B5CF6',
        'delivered': '#10B981',
        'Pronto para Entrega': '#F59E0B',
        'Entregue': '#10B981'
    };
    return colors[status] || '#9CA3AF';
};

// Componente do Card Flutuante da Entrega Ativa
const ActiveDeliveryCard = ({ delivery, onNavigate, onCall, onUpdateStatus }) => {
    if (!delivery) return null;

    const openWaze = (address) => {
        const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address.street + ', ' + address.city)}`;
        window.open(wazeUrl, '_blank');
    };

    const openGoogleMaps = (address) => {
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.street + ', ' + address.city)}`;
        window.open(mapsUrl, '_blank');
    };

    return (
        <Card className="absolute top-4 right-4 w-80 shadow-lg border-l-4 border-l-primary z-10">
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold">Entrega #{delivery.id}</h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(delivery.status)}`}>
                            {getStatusText(delivery.status)}
                        </span>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                        <Timer className="w-4 h-4 inline mr-1" />
                        ~25 min
                    </div>
                </div>
                
                <div className="space-y-2 text-sm">
                    <div>
                        <strong>Cliente:</strong> {delivery.customer?.name || 'N/A'}
                    </div>
                    <div>
                        <strong>Endereço:</strong> {delivery.deliveryAddress?.street || 'N/A'}
                    </div>
                    <div>
                        <strong>Valor:</strong> R$ {delivery.totalAmount || '0,00'}
                    </div>
                </div>

                <div className="flex gap-2 mt-4">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openWaze(delivery.deliveryAddress)}
                    >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Waze
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openGoogleMaps(delivery.deliveryAddress)}
                    >
                        <Route className="w-4 h-4 mr-1" />
                        Maps
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`tel:${delivery.customer?.phone}`, '_self')}
                    >
                        <Phone className="w-4 h-4" />
                    </Button>
                </div>

                {delivery.status !== 'delivered' && delivery.status !== 'Entregue' && (
                    <Button 
                        className="w-full mt-2" 
                        size="sm"
                        onClick={() => {
                            const nextStatus = getNextStatus(delivery.status);
                            onUpdateStatus(delivery.id, nextStatus);
                        }}
                    >
                        {getNextStatusText(delivery.status)}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};

// Funções auxiliares para status
const getStatusBadgeColor = (status) => {
    const colors = {
        'pending': 'bg-gray-100 text-gray-800',
        'accepted': 'bg-blue-100 text-blue-800',
        'picked_up': 'bg-yellow-100 text-yellow-800',
        'on_the_way': 'bg-purple-100 text-purple-800',
        'delivered': 'bg-green-100 text-green-800',
        'Pronto para Entrega': 'bg-yellow-100 text-yellow-800',
        'Entregue': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusText = (status) => {
    const texts = {
        'pending': 'Pendente',
        'accepted': 'Aceita',
        'picked_up': 'Coletada',
        'on_the_way': 'A caminho',
        'delivered': 'Entregue',
        'Pronto para Entrega': 'Pronta',
        'Entregue': 'Entregue'
    };
    return texts[status] || status;
};

const getNextStatus = (currentStatus) => {
    const statusFlow = {
        'pending': 'accepted',
        'accepted': 'picked_up',
        'picked_up': 'on_the_way',
        'on_the_way': 'delivered',
        'Pronto para Entrega': 'on_the_way'
    };
    return statusFlow[currentStatus] || currentStatus;
};

const getNextStatusText = (currentStatus) => {
    const texts = {
        'pending': 'Aceitar Entrega',
        'accepted': 'Marcar como Coletada',
        'picked_up': 'Iniciar Entrega',
        'on_the_way': 'Marcar como Entregue',
        'Pronto para Entrega': 'Iniciar Entrega'
    };
    return texts[currentStatus] || 'Atualizar Status';
};

// Componente Principal
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
    const [showMap, setShowMap] = useState(true);
    const [userLocation, setUserLocation] = useState(null);

    // Obter localização do usuário
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log("Erro ao obter localização:", error);
                    // Localização padrão (Videira, SC)
                    setUserLocation({ lat: -27.0060, lng: -51.1570 });
                }
            );
        } else {
            setUserLocation({ lat: -27.0060, lng: -51.1570 });
        }
    }, []);

    // Carregar script do Leaflet
    useEffect(() => {
        if (!window.L) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                console.log('Leaflet carregado');
            };
            document.head.appendChild(script);
        }
    }, []);

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
                            {showMap ? (
                                <>
                                    <DeliveryMap 
                                        deliveries={filteredDeliveries}
                                        activeDelivery={activeDelivery}
                                        onDeliverySelect={handleDeliverySelect}
                                        userLocation={userLocation}
                                        isVisible={showMap}
                                    />
                                    <ActiveDeliveryCard 
                                        delivery={activeDelivery}
                                        onUpdateStatus={handleUpdateStatus}
                                    />
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center bg-gray-50">
                                    <div className="text-center">
                                        <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">Mapa oculto</p>
                                    </div>
                                </div>
                            )}
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
