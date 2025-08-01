// src/components/PedidosDisponiveis.jsx
import React, { useState, useEffect } from 'react';
import DeliveryService from '../services/deliveryService'; 

const CardPedido = ({ pedido, onAceitar }) => (
  <div style={{ border: '1px solid #ccc', padding: '16px', margin: '8px', borderRadius: '8px' }}>
    <h3>ID do Pedido: {pedido.order_id}</h3>
    <p><strong>Endereço de Coleta:</strong> {pedido.formatted_address}</p>
    <p><strong>Valor Total:</strong> R$ {pedido.total_amount || '0.00'}</p>
    <button onClick={() => onAceitar(pedido.order_id)} style={{ padding: '10px 20px', background: 'green', color: 'white', border: 'none', borderRadius: '5px' }}>
      Aceitar Pedido
    </button>
  </div>
);

export function PedidosDisponiveis() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- ALTERAÇÃO NA FUNÇÃO DE ACEITAR O PEDIDO ---
  const handleAceitarPedido = async (pedidoId) => {
    try {
      // 1. Chama o nosso novo serviço para se comunicar com o backend
      await DeliveryService.acceptDelivery(pedidoId);

      // 2. Se a chamada for bem-sucedida, remove o pedido da lista na tela
      // Isso dá um feedback visual imediato para o entregador!
      setPedidos(currentPedidos =>
        currentPedidos.filter(p => p.order_id !== pedidoId)
      );

      // Opcional: Mostrar uma notificação de sucesso
      alert('Pedido aceito com sucesso! Você já pode iniciar a entrega.');

    } catch (error) {
      // 3. Se ocorrer um erro, exibe a mensagem para o entregador
      console.error("Erro ao aceitar pedido:", error);
      alert(`Erro: ${error.message}`);
    }
  };

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const data = await DeliveryService.getAvailableDeliveries();
        if (data) {
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
        pedidos.map((pedido) => (
          <CardPedido key={pedido.order_id} pedido={pedido} onAceitar={handleAceitarPedido} />
        ))
      )}
    </div>
  );
}