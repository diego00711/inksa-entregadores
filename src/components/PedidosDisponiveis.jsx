// src/components/PedidosDisponiveis.jsx
import React, { useState, useEffect } from 'react';
import DeliveryService from '../services/deliveryService';
import { acceptDelivery } from '../services/orderService';

const StatusBadge = ({ status }) => {
  const mapPT = {
    ready: 'Pronto',
    accepted_by_delivery: 'Aguardando Retirada',
  };
  const color = {
    ready: 'bg-purple-100 text-purple-800',
    accepted_by_delivery: 'bg-pink-100 text-pink-800',
  }[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${color}`}>
      {mapPT[status] || status}
    </span>
  );
};

const CardPedido = ({ pedido, onAceitar }) => (
  <div className="border border-gray-200 rounded-lg p-4 m-2 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-bold text-gray-800">Pedido #{String(pedido.id).slice(0, 8)}</h3>
      <StatusBadge status={pedido.status} />
    </div>

    <p className="text-sm text-gray-700">
      <strong>Restaurante:</strong> {pedido.restaurant_name || 'Restaurante'}
    </p>
    <p className="text-sm text-gray-700">
      <strong>Endereço de Coleta:</strong> {pedido.restaurant_address}
    </p>
    <p className="text-sm text-gray-700">
      <strong>Taxa de Entrega:</strong>{' '}
      {Number(pedido.delivery_fee || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
    </p>
    <p className="text-sm text-gray-700 mb-3">
      <strong>Valor Total:</strong>{' '}
      {Number(pedido.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
    </p>

    <button
      onClick={() => onAceitar(pedido.id)}
      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
    >
      Aceitar Pedido
    </button>
  </div>
);

export function PedidosDisponiveis() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = async () => {
    try {
      const data = await DeliveryService.getAvailableDeliveries();
      if (Array.isArray(data)) setPedidos(data);
    } catch (error) {
      console.error('Erro ao buscar pedidos disponíveis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAceitarPedido = async (pedidoId) => {
    try {
      await acceptDelivery(pedidoId);
      // Remove da lista local
      setPedidos((list) => list.filter((p) => p.id !== pedidoId));
      alert('Pedido aceito com sucesso! Vá ao restaurante para retirar.');
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
      alert(`Erro ao aceitar: ${error?.response?.data?.error || error.message}`);
    }
  };

  useEffect(() => {
    fetchPedidos();
    const intervalId = setInterval(fetchPedidos, 10000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <div>Procurando novas entregas...</div>;

  return (
    <div className="p-2">
      <h2 className="text-lg font-bold mb-2">Pedidos Disponíveis para Entrega</h2>
      {pedidos.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum pedido disponível no momento. Aguardando...</p>
      ) : (
        pedidos.map((pedido) => (
          <CardPedido key={pedido.id} pedido={pedido} onAceitar={handleAceitarPedido} />
        ))
      )}
    </div>
  );
}

export default PedidosDisponiveis;
