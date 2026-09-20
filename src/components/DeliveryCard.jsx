// src/components/DeliveryCard.jsx
import React from 'react';
import {
  MapPin, Package, DollarSign, Clock, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { numeroPedido } from '../utils/pedidoNumero';
import { brl } from '../utils/dinheiro';
import { rotuloDeStatus, classeDeStatus } from '../utils/rotuloDeStatus';
import { BotaoWaze } from './BotaoWaze';

const formatDate = (s) => {
  if (!s) return 'Data não disponível';
  try {
    const d = new Date(s);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'Data inválida'; }
};

const StatusBadge = ({ status }) => (
  <Badge className={`${classeDeStatus(status)} font-medium`}>{rotuloDeStatus(status)}</Badge>
);

export function DeliveryCard({ delivery, onClick, isAvailable = false }) {
  // O entregador vê o LÍQUIDO (o que cai pra ele, já sem a taxa da plataforma),
  // não o frete cheio — senão parece que ganha mais do que ganha. Só cai pro
  // frete bruto se, por algum motivo, o líquido não tiver sido calculado.
  const _net = Number(delivery.valor_repassado_entregador);
  const deliveryFee = brl(_net > 0 ? _net : delivery.delivery_fee);
  const totalAmount = brl(delivery.total_amount);
  const restaurantName = delivery.restaurant_name || 'Restaurante não informado';
  const restaurantAddress = delivery.restaurant_address || 'Endereço não disponível';
  const deliveryAddress = delivery.delivery_address || 'Endereço de entrega não disponível';
  const clientName = delivery.client_name || delivery.customer?.name || 'Cliente';
  const orderId = numeroPedido(delivery).replace('#', '');


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

        {/* ⚠️ AQUI FICAVA O CÓDIGO DE RETIRADA (removido em 20/09/2026).
            A conferência inverteu: o PARCEIRO mostra o número na tela dele e
            o entregador digita no app. Um código que o entregador já tem não
            prova que ele foi até a loja — e era isso que o código existia pra
            provar. A ação agora é o botão "Retirada" na entrega ativa. */}

        <div className="mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-2 mb-1">
            <MapPin className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{restaurantName}</p>
              <p className="text-xs text-gray-500 break-words">{restaurantAddress}</p>
            </div>
          </div>
        </div>

        {!isAvailable && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{clientName}</p>
                <p className="text-xs text-gray-500 break-words">{deliveryAddress}</p>
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
                <p className="text-sm text-gray-700 break-words">{deliveryAddress}</p>
              </div>
            </div>
          </div>
        )}

        {/* NAVEGAR, NO CARD — não escondido dentro do modal.
            O entregador vive nesta lista; obrigar a abrir um modal pra achar o
            botão de navegar é um toque a mais de capacete no trânsito. Só
            aparece em corrida ACEITA: numa entrega ainda disponível não há pra
            onde ir, ele só está decidindo se pega. */}
        {!isAvailable && (
          <div className="mb-3">
            <BotaoWaze pedido={delivery} />
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Você recebe</p>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="font-bold text-sm text-green-600">{deliveryFee}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total</p>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-gray-600" />
                <span className="font-semibold text-sm text-gray-700">{totalAmount}</span>
              </div>
            </div>
            {/* PORTE do pedido — quantas unidades vai carregar. Sem isso ele
                aceita às cegas e só descobre o tamanho na porta da loja; numa
                compra de mercado, é viagem perdida. Acima de 10 itens fica
                laranja pra chamar atenção antes do aceite. */}
            {delivery.items_count > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Volume</p>
                <div className="flex items-center gap-1">
                  <Package className={`h-3 w-3 ${delivery.items_count > 10 ? 'text-orange-600' : 'text-gray-600'}`} />
                  <span className={`font-semibold text-sm ${delivery.items_count > 10 ? 'text-orange-600' : 'text-gray-700'}`}>
                    {delivery.items_count} {delivery.items_count === 1 ? 'item' : 'itens'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {delivery.created_at && (
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-wrap justify-end">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="break-words">{formatDate(delivery.created_at)}</span>
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
