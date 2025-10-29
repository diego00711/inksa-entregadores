// src/components/DeliveryCard.jsx
import React, { useState } from 'react';
import {
  MapPin, Package, DollarSign, Clock, ChevronRight, KeyRound
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPickupCode } from '../services/orderService';

const toNumber = (v) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || 0 : 0);
const formatCurrency = (v) => toNumber(v).toFixed(2);

const formatDate = (s) => {
  if (!s) return 'Data não disponível';
  try {
    const d = new Date(s);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'Data inválida'; }
};

const StatusBadge = ({ status }) => {
  const map = {
    pending: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-800' },
    accepted: { label: 'Aceito', cls: 'bg-blue-100 text-blue-800' },
    ready: { label: 'Pronto', cls: 'bg-green-100 text-green-800' },
    preparing: { label: 'Preparando', cls: 'bg-orange-100 text-orange-800' },
    accepted_by_delivery: { label: 'Aguardando Retirada', cls: 'bg-pink-100 text-pink-800' },
    delivering: { label: 'Em Rota', cls: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'Entregue', cls: 'bg-gray-100 text-gray-800' }
  };
  const info = map[status] || { label: status, cls: 'bg-gray-100 text-gray-800' };
  return <Badge className={`${info.cls} font-medium`}>{info.label}</Badge>;
};

export function DeliveryCard({ delivery, onClick, isAvailable = false }) {
  const [inlineCode, setInlineCode] = useState('');
  const deliveryFee = formatCurrency(delivery.delivery_fee);
  const totalAmount = formatCurrency(delivery.total_amount);
  const restaurantName = delivery.restaurant_name || 'Restaurante não informado';
  const restaurantAddress = delivery.restaurant_address || 'Endereço não disponível';
  const deliveryAddress = delivery.delivery_address || 'Endereço de entrega não disponível';
  const clientName = delivery.client_name || delivery.customer?.name || 'Cliente';
  const orderId = delivery.id ? String(delivery.id).substring(0, 8) : 'N/A';

  const pickupCode = delivery.pickup_code || inlineCode;
  const showCode = pickupCode && !isAvailable;

  const handleShowCode = async (e) => {
    e.stopPropagation();
    try {
      const res = await getPickupCode(delivery.id);
      const code = res?.pickup_code || '';
      if (code) {
        setInlineCode(code);
        await navigator.clipboard?.writeText(code).catch(() => {});
      }
    } catch { /* silencioso */ }
  };

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-orange-300 border-2" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" />
            <span className="font-semibold text-sm text-gray-700">#{orderId}</span>
          </div>
          {delivery.status && <StatusBadge status={delivery.status} />}
        </div>

        {showCode ? (
          <div className="mb-3 pb-3 border-b-2 border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-purple-600 p-2 rounded-full">
                  <KeyRound className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Código de Retirada</p>
                  <p className="text-xs text-purple-600">Mostre ao restaurante</p>
                </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border-2 border-purple-300 shadow-md">
                <span className="text-2xl font-bold text-purple-700 tracking-widest">
                  {pickupCode}
                </span>
              </div>
            </div>
          </div>
        ) : (!isAvailable && (delivery.status === 'accepted_by_delivery' || delivery.status === 'ready')) ? (
          <div className="mb-3">
            <button
              onClick={handleShowCode}
              className="text-xs px-3 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700"
            >
              <KeyRound className="inline-block mr-1 h-3 w-3" />
              Ver código de retirada
            </button>
          </div>
        ) : null}

        <div className="mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-2 mb-1">
            <MapPin className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{restaurantName}</p>
              <p className="text-xs text-gray-500 truncate">{restaurantAddress}</p>
            </div>
          </div>
        </div>

        {!isAvailable && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{clientName}</p>
                <p className="text-xs text-gray-500 truncate">{deliveryAddress}</p>
              </div>
            </div>
          </div>
        )}

        {isAvailable && deliveryAddress && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-0.5">Entregar em:</p>
                <p className="text-sm text-gray-700 truncate">{deliveryAddress}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Taxa</p>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="font-bold text-sm text-green-600">R$ {deliveryFee}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total</p>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-gray-600" />
                <span className="font-semibold text-sm text-gray-700">R$ {totalAmount}</span>
              </div>
            </div>
          </div>

          {delivery.created_at && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatDate(delivery.created_at)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
            <span>{isAvailable ? 'Ver detalhes' : 'Gerenciar'}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
