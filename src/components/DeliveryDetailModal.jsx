// src/components/DeliveryDetailModal.jsx - VERSÃO CORRIGIDA

import React, { useState } from 'react';
import { X, MapPin, Package, DollarSign, Clock, Phone, Navigation, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { acceptDelivery } from '../services/orderService';
import { useToast } from '../context/ToastContext';

// ✅ Helper para converter valores monetários
const toNumber = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
};

const formatCurrency = (value) => {
    const num = toNumber(value);
    return num.toFixed(2);
};

// ✅ Helper para parsear itens do pedido
const parseItems = (items) => {
    if (!items) return [];
    
    // Se já for array, retorna
    if (Array.isArray(items)) return items;
    
    // Se for string JSON, parseia
    if (typeof items === 'string') {
        try {
            const parsed = JSON.parse(items);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Erro ao parsear itens:', e);
            return [];
        }
    }
    
    return [];
};

// ✅ Helper para parsear endereço
const parseAddress = (address) => {
    if (!address) return 'Endereço não disponível';
    
    // Se for string JSON, parseia
    if (typeof address === 'string') {
        try {
            const parsed = JSON.parse(address);
            return `${parsed.street || ''}, ${parsed.number || ''}, ${parsed.neighborhood || ''}, ${parsed.city || ''}`.replace(/,\s*,/g, ',').trim();
        } catch (e) {
            return address; // Retorna a string original se não for JSON
        }
    }
    
    // Se for objeto
    if (typeof address === 'object') {
        return `${address.street || ''}, ${address.number || ''}, ${address.neighborhood || ''}, ${address.city || ''}`.replace(/,\s*,/g, ',').trim();
    }
    
    return 'Endereço não disponível';
};

export function DeliveryDetailModal({ order, onClose, isLoading, onUpdateStatus, isAvailable = false }) {
    const addToast = useToast();
    const [accepting, setAccepting] = useState(false);

    if (!order) return null;

    // ✅ Parsear itens e endereços
    const items = parseItems(order.items);
    const deliveryAddress = parseAddress(order.delivery_address);
    const restaurantAddress = order.restaurant_address || 'Endereço do restaurante não disponível';
    
    // ✅ Calcular valores
    const subtotal = toNumber(order.total_amount_items || order.total_amount - order.delivery_fee);
    const deliveryFee = toNumber(order.delivery_fee);
    const total = toNumber(order.total_amount);

    // ✅ Handler para aceitar pedido
    const handleAcceptOrder = async () => {
        try {
            setAccepting(true);
            await acceptDelivery(order.id);
            addToast('Pedido aceito com sucesso! 🎉', 'success');
            if (onUpdateStatus) {
                onUpdateStatus(order.id, 'accepted');
            }
            onClose();
        } catch (error) {
            console.error('Erro ao aceitar pedido:', error);
            addToast('Erro ao aceitar pedido. Tente novamente.', 'error');
        } finally {
            setAccepting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Package className="h-5 w-5 text-orange-500" />
                        Detalhes do Pedido
                    </DialogTitle>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <div className="space-y-6 pt-4">
                        {/* Informações da Entrega */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-orange-500" />
                                Informações da Entrega
                            </h3>
                            
                            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                                {order.status && (
                                    <div>
                                        <p className="text-sm text-gray-600 font-medium">Status:</p>
                                        <p className="text-gray-800">{order.status}</p>
                                    </div>
                                )}
                                
                                <div>
                                    <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-orange-500" />
                                        Endereço de Coleta:
                                    </p>
                                    <p className="text-gray-800">{restaurantAddress}</p>
                                </div>
                                
                                <div>
                                    <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-green-500" />
                                        Endereço de Entrega:
                                    </p>
                                    <p className="text-gray-800">{deliveryAddress}</p>
                                </div>
                            </div>
                        </div>

                        {/* Itens do Pedido */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                <Package className="h-5 w-5 text-orange-500" />
                                Itens do Pedido
                            </h3>
                            
                            {items.length > 0 ? (
                                <div className="space-y-2">
                                    {items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-800">{item.name || 'Item'}</p>
                                                <p className="text-sm text-gray-600">Qtd: {item.quantity || 1}</p>
                                            </div>
                                            <p className="font-semibold text-gray-800">
                                                R$ {formatCurrency(item.price * (item.quantity || 1))}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-600 text-center py-4 bg-gray-50 rounded-lg">
                                    Nenhum item encontrado.
                                </p>
                            )}
                        </div>

                        {/* Valores */}
                        <div className="border-t pt-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-semibold">R$ {formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Taxa de Entrega:</span>
                                    <span className="font-semibold text-green-600">R$ {formatCurrency(deliveryFee)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Total do Pedido:</span>
                                    <span className="text-orange-600">R$ {formatCurrency(total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mapa da Rota */}
                        {order.restaurant_address && order.delivery_address && (
                            <div>
                                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                    <Navigation className="h-5 w-5 text-orange-500" />
                                    Mapa da Rota
                                </h3>
                                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                                    <p className="text-gray-600">Mapa em desenvolvimento</p>
                                </div>
                            </div>
                        )}

                        {/* Botões de Ação */}
                        <div className="flex gap-3 pt-4 border-t">
                            {/* ✅ BOTÃO ACEITAR - Só aparece se isAvailable === true */}
                            {isAvailable && (
                                <Button
                                    onClick={handleAcceptOrder}
                                    disabled={accepting}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-base"
                                >
                                    {accepting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Aceitando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-5 w-5" />
                                            Aceitar Pedido
                                        </>
                                    )}
                                </Button>
                            )}
                            
                            <Button
                                onClick={onClose}
                                variant="outline"
                                className="flex-1 py-6 text-base"
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
