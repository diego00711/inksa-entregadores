// inksa-entregadores/src/hooks/useDeliveredOrders.js - VERSÃO COMPLETA

import { useState, useEffect } from 'react';
import { getOrdersToReview } from '../services/orderService';

/**
 * Custom Hook para buscar pedidos entregues pendentes de avaliação (ENTREGADOR)
 * Busca pedidos que o entregador já entregou mas ainda não avaliou o cliente
 * @param {string} deliveryId - O ID do perfil do entregador
 */
export default function useDeliveredOrders(deliveryId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!deliveryId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 [Entregador] Buscando pedidos pendentes de avaliação...');
        
        // ✅ Chama o endpoint específico do entregador
        const pendingOrders = await getOrdersToReview(signal);
        
        console.log(`✅ [Entregador] ${pendingOrders.length} pedidos pendentes encontrados`);
        
        setOrders(pendingOrders || []);
        
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('❌ [Entregador] Erro ao buscar pedidos:', err);
          setError(err.message || "Não foi possível carregar os pedidos.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    return () => {
      controller.abort();
    };
  }, [deliveryId]);

  // ✅ Função para refazer busca (útil após criar avaliação)
  const refetch = () => {
    if (!deliveryId) return;
    
    setLoading(true);
    setError(null);
    
    getOrdersToReview()
      .then(data => setOrders(data || []))
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  };

  return { orders, loading, error, refetch };
}
