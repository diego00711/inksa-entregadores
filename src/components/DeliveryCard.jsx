// src/components/DeliveryCard.jsx (Com clique apenas no botão)

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { MapPin, ShoppingBag, Info } from 'lucide-react'; 

// ... (a lógica de statusConfig continua a mesma) ...
const statusConfig = {
  pending: { text: 'Novo Pedido', variant: 'destructive' },
  accepted: { text: 'Aceito', variant: 'default' },
  picked_up: { text: 'Em Rota', variant: 'default' },
  on_the_way: { text: 'A Caminho', variant: 'default' },
  delivered: { text: 'Entregue', variant: 'secondary' },
  default: { text: 'Desconhecido', variant: 'outline' }
};


export function DeliveryCard({ delivery, onClick }) { // A prop 'onClick' agora será usada apenas pelo botão
  // ... (toda a lógica de fallback de dados continua a mesma) ...
  const orderId = delivery?.id?.substring(0, 8) || 'N/A';
  const fee = delivery?.delivery_fee ?? 0;
  const distance = delivery?.total_distance ? `${delivery.total_distance.toFixed(1)} km` : 'N/A';
  const restaurantAddress = delivery?.restaurant_address || 'Endereço do restaurante não informado';
  const clientAddress = delivery?.delivery_address || 'Endereço do cliente não informado';
  const currentStatus = statusConfig[delivery?.status] || statusConfig.default;

  return (
    // ✅ CORREÇÃO 1: Removido o 'onClick' e a classe 'cursor-pointer' do Card.
    <Card className="flex flex-col rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* O CardHeader e o CardContent permanecem exatamente os mesmos */}
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold text-gray-800">Pedido #{orderId}</CardTitle>
          <Badge variant={currentStatus.variant}>{currentStatus.text}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-grow space-y-4">
        <div className="flex justify-around text-center border-t border-b py-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Valor da Corrida</p>
            <p className="text-xl font-bold text-green-600">R$ {fee.toFixed(2)}</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Distância Total</p>
            <p className="text-xl font-bold text-gray-800">{distance}</p>
          </div>
        </div>

        <div className="space-y-1 relative">
          <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
          <div className="flex items-start gap-3 relative z-10">
            <div className="bg-white p-1 rounded-full"><ShoppingBag className="h-5 w-5 text-orange-500" /></div>
            <div>
              <p className="font-semibold text-gray-700">Coleta</p>
              <p className="text-sm text-gray-600">{restaurantAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 relative z-10 pt-3">
            <div className="bg-white p-1 rounded-full"><MapPin className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="font-semibold text-gray-700">Entrega</p>
              <p className="text-sm text-gray-600">{clientAddress}</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        {/* ✅ CORREÇÃO 1: O onClick agora está apenas neste botão. */}
        <Button 
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          onClick={onClick} // Ação de clique é passada aqui
        >
          <Info className="mr-2 h-4 w-4" />
          Ver Detalhes
        </Button>
      </CardFooter>
    </Card>
  );
}
