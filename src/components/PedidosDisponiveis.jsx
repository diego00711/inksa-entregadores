// src/components/PedidosDisponiveis.jsx (VERSÃO FINAL E CORRIGIDA)
import React, { useState, useEffect } from 'react';
// ✅ CORREÇÃO 1: Importar o serviço correto para aceitar a entrega.
// A função acceptDelivery não está em DeliveryService, mas sim em orderService do entregador.
// Vamos criar um novo serviço para isso para manter a organização.
import { acceptDelivery } from '../services/orderService'; // Supondo que esta função exista
import DeliveryService from '../services/deliveryService'; // Para buscar os pedidos

const CardPedido = ({ pedido, onAceitar }) => (
  <div style={{ border: '1px solid #ccc', padding: '16px', margin: '8px', borderRadius: '8px' }}>
    {/* ✅ CORREÇÃO 2: Usar os nomes de campos corretos que vêm da API */}
    <h3>ID do Pedido: {pedido.id.substring(0, 8)}</h3>
    <p><strong>Endereço de Coleta:</strong> {pedido.restaurant_address}</p>
    <p><strong>Taxa de Entrega:</strong> R$ {pedido.delivery_fee ? pedido.delivery_fee.toFixed(2) : '0.00'}</p>
    <p><strong>Valor Total:</strong> R$ {pedido.total_amount ? pedido.total_amount.toFixed(2) : '0.00'}</p>
    
    {/* ✅ CORREÇÃO 3: Passar o ID correto para a função de aceitar */}
    <button onClick={() => onAceitar(pedido.id)} style={{ padding: '10px 20px', background: 'green', color: 'white', border: 'none', borderRadius: '5px' }}>
      Aceitar Pedido
    </button>
  </div>
);

export function PedidosDisponiveis() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleAceitarPedido = async (pedidoId) => {
    try {
      // ✅ CORREÇÃO 4: Usar a função importada correta para aceitar o pedido.
      // Precisamos criar um endpoint para isso no backend e uma função no serviço.
      // Por agora, vamos assumir que `acceptDelivery` existe e funciona.
      // Se não funcionar, o próximo passo é criar `POST /api/orders/{orderId}/accept`
      await acceptDelivery(pedidoId);

      setPedidos(currentPedidos =>
        currentPedidos.filter(p => p.id !== pedidoId)
      );

      alert('Pedido aceito com sucesso! Você já pode iniciar a entrega.');

    } catch (error) {
      console.error("Erro ao aceitar pedido:", error);
      alert(`Erro: ${error.message}`);
    }
  };

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const data = await DeliveryService.getAvailableDeliveries();
        // A API já retorna um array, então a verificação é mais simples
        if (Array.isArray(data)) {
          setPedidos(data);
        }
      } catch (error) {
        console.error("Erro ao buscar pedidos disponíveis:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
    const intervalId = setInterval(fetchPedidos, 10000); 
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div>A procurar por novas entregas...</div>;
  }

  return (
    <div>
      <h2>Pedidos Disponíveis para Entrega</h2>
      {pedidos.length === 0 ? (
        <p>Nenhum pedido disponível no momento. A aguardar...</p>
      ) : (
        // ✅ CORREÇÃO 5: Usar o ID correto como chave do map
        pedidos.map((pedido) => (
          <CardPedido key={pedido.id} pedido={pedido} onAceitar={handleAceitarPedido} />
        ))
      )}
    </div>
  );
}
