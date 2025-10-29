// src/components/DeliveryDetailModal.jsx
import React, { useState } from 'react';
import {
  X, MapPin, Package, DollarSign, Clock,
  Navigation, CheckCircle, Loader2, KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { acceptDelivery, getPickupCode } from '../services/orderService';
import { useToast } from '../context/ToastContext';

// helpers
const toNumber = (v) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || 0 : 0);
const formatCurrency = (v) => toNumber(v).toFixed(2);

const parseItems = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try { const p = JSON.parse(items); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
};

const parseAddress = (address) => {
  if (!address) return 'Endereço não disponível';
  if (typeof address === 'string') {
    try {
      const a = JSON.parse(address);
      return `${a.street || ''}, ${a.number || ''}, ${a.neighborhood || ''}, ${a.city || ''}`
        .replace(/,\s*,/g, ',').trim();
    } catch { return address; }
  }
  if (typeof address === 'object') {
    return `${address.street || ''}, ${address.number || ''}, ${address.neighborhood || ''}, ${address.city || ''}`
      .replace(/,\s*,/g, ',').trim();
  }
  return 'Endereço não disponível';
};

export function DeliveryDetailModal({
  order,
  onClose,
  isLoading,
  onUpdateStatus,
  isAvailable = false
}) {
  const addToast = useToast();
  const [accepting, setAccepting] = useState(false);
  const [pickupCode, setPickupCode] = useState('');        // ⬅️ novo

  if (!order) return null;

  const items = parseItems(order.items);
  const deliveryAddress = parseAddress(order.delivery_address);
  const restaurantAddress = order.restaurant_address || 'Endereço do restaurante não disponível';

  const subtotal = toNumber(order.total_amount_items ?? (order.total_amount - order.delivery_fee));
  const deliveryFee = toNumber(order.delivery_fee);
  const total = toNumber(order.total_amount);

  // aceitar e já buscar o código
  const handleAcceptOrder = async () => {
    try {
      setAccepting(true);
      await acceptDelivery(order.id);
      addToast('Pedido aceito com sucesso! 🎉', 'success');

      // busca o código e mostra dentro do modal
      try {
        const res = await getPickupCode(order.id);
        const code = res?.pickup_code || '';
        if (code) {
          setPickupCode(code);
          await navigator.clipboard?.writeText(code).catch(() => {});
          addToast('Código de retirada copiado para a área de transferência.', 'info');
        }
      } catch (e) {
        addToast('Não foi possível obter o código de retirada agora.', 'warning');
      }

      onUpdateStatus?.(order.id, 'accepted_by_delivery');
      // não fecha o modal: deixa o código visível
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
      addToast('Erro ao aceitar pedido. Tente novamente.', 'error');
    } finally {
      setAccepting(false);
    }
  };

  // botão “ver código” quando já aceito/aguardando retirada
  const handleShowCode = async () => {
    try {
      const res = await getPickupCode(order.id);
      const code = res?.pickup_code || '';
      if (code) {
        setPickupCode(code);
        await navigator.clipboard?.writeText(code).catch(() => {});
        addToast('Código de retirada copiado para a área de transferência.', 'info');
      } else {
        addToast('Código ainda indisponível para este pedido.', 'warning');
      }
    } catch (e) {
      addToast('Erro ao obter o código de retirada.', 'error');
    }
  };

  const canShowGetCodeButton =
    !isAvailable && ['accepted_by_delivery', 'ready'].includes(order.status || '');

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
             onClick={(e) => e.stopPropagation()}>

          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Detalhes do Pedido
            </h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* bloco com o código quando disponível */}
              {pickupCode && (
                <div className="p-4 rounded-lg border-2 border-purple-300 bg-purple-50">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="h-5 w-5 text-purple-700" />
                    <p className="text-sm text-purple-700 font-medium">Código de Retirada</p>
                  </div>
                  <div className="text-3xl font-extrabold tracking-widest text-purple-700 select-all">
                    {pickupCode}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Apresente este código no balcão do restaurante.
                  </p>
                </div>
              )}

              {/* info entrega */}
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

              {/* itens */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-500" />
                  Itens do Pedido
                </h3>
                {items.length > 0 ? (
                  <div className="space-y-2">
                    {items.map((it, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{it.name || 'Item'}</p>
                          <p className="text-sm text-gray-600">Qtd: {it.quantity || 1}</p>
                        </div>
                        <p className="font-semibold text-gray-800">
                          R$ {formatCurrency((it.price || 0) * (it.quantity || 1))}
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

              {/* valores */}
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

              {/* rota */}
              {(restaurantAddress || deliveryAddress) && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-orange-500" />
                    Mapa da Rota
                  </h3>
                  <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-center justify-center gap-4">
                    <p className="text-gray-600">Abrir navegação:</p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() =>
                          window.open(
                            `https://waze.com/ul?q=${encodeURIComponent(deliveryAddress)}`, '_blank'
                          )
                        }
                        className="bg-[#00D8FF] hover:bg-[#00C4E6] text-white"
                      >
                        Abrir no Waze
                      </Button>
                      <Button
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                              deliveryAddress
                            )}`, '_blank'
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Abrir no Maps
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ações */}
              <div className="flex gap-3 pt-4 border-t">
                {isAvailable ? (
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
                ) : canShowGetCodeButton ? (
                  <Button
                    onClick={handleShowCode}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6 text-base"
                  >
                    <KeyRound className="mr-2 h-5 w-5" />
                    Ver Código de Retirada
                  </Button>
                ) : null}

                <Button onClick={onClose} variant="outline" className="flex-1 py-6 text-base">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
