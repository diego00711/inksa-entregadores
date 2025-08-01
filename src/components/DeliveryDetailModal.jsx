// Ficheiro: src/components/DeliveryDetailModal.jsx (VERSÃO FINAL COM MAPA CONECTADO)

import React, { useState, useEffect } from 'react'; 
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogOverlay, DialogClose } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { MapDisplay } from './MapDisplay';

const actionConfig = {
  accepted: { text: 'Confirmar Coleta', nextStatus: 'picked_up' },
  picked_up: { text: 'Iniciar Rota de Entrega', nextStatus: 'on_the_way' },
  on_the_way: { text: 'Finalizar Entrega', nextStatus: 'delivered' },
};

export function DeliveryDetailModal({ order, onClose, isLoading, onUpdateStatus }) {
  const [internalOrder, setInternalOrder] = useState(null);

  useEffect(() => {
    if (order && typeof order === 'object') {
      setInternalOrder(order);
    }
  }, [order]);

  const handleActionClick = () => {
    if (!internalOrder) return;
    const action = actionConfig[internalOrder.status];
    if (action) {
      onUpdateStatus(internalOrder.id, action.nextStatus);
      onClose();
    }
  };

  const currentAction = internalOrder ? actionConfig[internalOrder.status] : null;

  // ✅ 1. LÓGICA FINAL PARA AS COORDENADAS
  // Usando os nomes que vimos na sua consola.
  
  const pickupCoords = internalOrder?.restaurant_latitude && internalOrder?.restaurant_longitude
    ? [internalOrder.restaurant_latitude, internalOrder.restaurant_longitude]
    : null;

  // Adicionamos uma verificação para garantir que a lat e lng não sejam 0
  const deliveryCoords = internalOrder?.client_latitude && internalOrder?.client_longitude && internalOrder.client_latitude !== 0
    ? [internalOrder.client_latitude, internalOrder.client_longitude]
    : null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/60 z-40" />
      
      <DialogContent className="bg-white sm:max-w-3xl p-0 flex flex-col max-h-[90vh] z-50">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-gray-800">Detalhes do Pedido</DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
            {isLoading ? (
                <div className="flex justify-center items-center h-full min-h-[200px]"><Loader2 className="h-10 w-10 animate-spin text-orange-500" /></div>
            ) : internalOrder ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg border-b pb-2">Informações da Entrega</h3>
                            <p><strong>Status:</strong> <span className="font-semibold">{internalOrder.status || 'N/A'}</span></p>
                            <p><strong>Endereço de Coleta:</strong> {internalOrder.restaurant_address}</p>
                            <p><strong>Endereço de Entrega:</strong> {internalOrder.delivery_address}</p>
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg border-b pb-2">Itens do Pedido</h3>
                            <ul className="space-y-2">
                            {internalOrder.items?.length > 0 ? (
                                internalOrder.items.map((item, index) => (
                                <li key={index} className="flex justify-between text-sm">
                                    <span>{item.quantity || 1}x {item.name}</span>
                                    <span className="font-medium">R$ {item.price?.toFixed(2) || '0.00'}</span>
                                </li>
                                ))
                            ) : ( <li>Nenhum item encontrado.</li> )}
                            </ul>
                            <div className="space-y-2 pt-4 border-t">
                                <p className="flex justify-between"><span>Subtotal:</span> <span>R$ {internalOrder.subtotal?.toFixed(2) || '0.00'}</span></p>
                                <p className="flex justify-between"><span>Taxa de Entrega:</span> <span>R$ {internalOrder.delivery_fee?.toFixed(2) || '0.00'}</span></p>
                                <p className="flex justify-between font-bold text-xl pt-2 border-t mt-2">
                                <span>Total do Pedido:</span> 
                                <span>R$ {internalOrder.total_amount?.toFixed(2) || '0.00'}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h3 className="font-bold text-lg border-b pb-2">Mapa da Rota</h3>
                        <div className="h-72 w-full bg-gray-200 rounded-md">
                            {/* ✅ 2. MAPA CONECTADO AOS DADOS CORRETOS */}
                            <MapDisplay 
                                pickupCoords={pickupCoords} 
                                deliveryCoords={deliveryCoords}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-6 text-center"><p className="text-red-500">Não foi possível carregar os detalhes do pedido.</p></div>
            )}
        </div>

        <DialogFooter className="p-4 border-t bg-gray-50 flex-shrink-0">
          <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
          {currentAction && (<Button className="bg-orange-500 hover:bg-orange-600" onClick={handleActionClick}>{currentAction.text}</Button>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}