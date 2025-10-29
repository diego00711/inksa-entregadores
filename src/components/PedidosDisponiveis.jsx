// src/components/PedidosDisponiveis.jsx
import React, { useEffect, useRef, useState } from 'react';
import { getAvailableOrders, acceptDelivery, getPickupCode } from '../services/orderService';

const toBRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const StatusBadge = ({ status }) => {
  const pt = { ready: 'Pronto', accepted_by_delivery: 'Aguardando Retirada' }[status] || status;
  const color =
    status === 'ready'
      ? 'bg-purple-100 text-purple-800'
      : status === 'accepted_by_delivery'
      ? 'bg-pink-100 text-pink-800'
      : 'bg-gray-100 text-gray-800';
  return <span className={`px-2 py-1 text-xs rounded-full font-semibold ${color}`}>{pt}</span>;
};

const CardPedido = ({ pedido, onAceitar }) => {
  const shortId = String(pedido.id || '').slice(0, 8);
  return (
    <div className="border border-gray-200 rounded-lg p-4 m-2 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-800">Pedido #{shortId}</h3>
        <StatusBadge status={pedido.status} />
      </div>
      <div className="text-sm text-gray-700 space-y-1">
        <p><strong>Restaurante:</strong> {pedido.restaurant_name || 'Restaurante'}</p>
        <p><strong>Endereço de Coleta:</strong> {pedido.restaurant_address || '—'}</p>
        <p><strong>Taxa de Entrega:</strong> {toBRL(pedido.delivery_fee)}</p>
        <p><strong>Valor Total:</strong> {toBRL(pedido.total_amount)}</p>
        {pedido.created_at && (
          <p className="text-xs text-gray-500">
            Criado em: {new Date(pedido.created_at).toLocaleString()}
          </p>
        )}
      </div>
      <div className="mt-3">
        <button
          onClick={() => onAceitar(pedido.id)}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
        >
          Aceitar Pedido
        </button>
      </div>
    </div>
  );
};

const Modal = ({ open, onClose, children, title }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-5 w-[min(92vw,480px)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function PedidosDisponiveis() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [pickupInfo, setPickupInfo] = useState({ open: false, code: '', orderId: '' });

  const pollingRef = useRef(null);
  const mountedRef = useRef(false);

  const fetchPedidos = async () => {
    try {
      setErrMsg('');
      const data = await getAvailableOrders();
      if (!mountedRef.current) return;
      setPedidos(Array.isArray(data) ? data : []);
    } catch (error) {
      if (!mountedRef.current) return;
      setErrMsg(error?.message || 'Erro ao buscar pedidos disponíveis.');
      console.error('[PedidosDisponiveis] fetch error:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleAceitarPedido = async (pedidoId) => {
    try {
      await acceptDelivery(pedidoId);
      // remove localmente
      setPedidos((list) => list.filter((p) => p.id !== pedidoId));
      // busca o código e mostra modal
      const res = await getPickupCode(pedidoId);
      const code = res?.pickup_code || '';
      setPickupInfo({ open: true, code, orderId: pedidoId });
    } catch (error) {
      const msg = error?.message || 'Erro ao aceitar pedido.';
      alert(msg);
      console.error('[PedidosDisponiveis] accept error:', error);
    }
  };

  // Polling SUAVE: 15s, pausa quando a aba estiver oculta
  const startPolling = () => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') fetchPedidos();
    }, 15000);
  };
  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchPedidos();
    startPolling();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPedidos();
        startPolling();
      } else {
        stopPolling();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mountedRef.current = false;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (loading) return <div className="p-3 text-sm text-gray-700">Procurando novas entregas...</div>;

  return (
    <div className="p-2">
      <h2 className="text-lg font-bold mb-2">Pedidos Disponíveis para Entrega</h2>

      {errMsg && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {errMsg}
        </div>
      )}

      {pedidos.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum pedido disponível no momento. Aguardando...</p>
      ) : (
        pedidos.map((pedido) => (
          <CardPedido key={pedido.id} pedido={pedido} onAceitar={handleAceitarPedido} />
        ))
      )}

      {/* Modal com o código de retirada */}
      <Modal
        open={pickupInfo.open}
        onClose={() => setPickupInfo({ open: false, code: '', orderId: '' })}
        title="Código de Retirada"
      >
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Apresente este código ao restaurante para confirmar a retirada:
          </p>
          <div className="text-3xl font-extrabold tracking-widest text-purple-700 mb-2">
            {pickupInfo.code || '— — — —'}
          </div>
          <p className="text-xs text-gray-500">
            Pedido #{String(pickupInfo.orderId).slice(0, 8)}
          </p>
        </div>
      </Modal>
    </div>
  );
}
