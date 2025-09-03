// src/pages/DeliverymanEvaluationsCenter.jsx

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageSquare, User, Clock } from 'lucide-react';

// ✅ CORREÇÃO: Ajusta o caminho da importação para o ProfileContext
import { useProfile } from '../context/ProfileContext'; 

// Importa as novas funções de serviço dos arquivos corretos
import { getMyDeliveryReviews, postClientReview } from '../services/reviewService';
import { getOrdersToReview } from '../services/orderService';
import ClientReviewForm from '../components/ClientReviewForm'; // Supondo que você tenha este formulário

// Componente para exibir uma avaliação recebida
const ReviewReceivedCard = ({ review }) => (
  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-gray-500" />
        <div>
          <p className="text-xs font-bold text-gray-700">{review.reviewer_name}</p>
          <p className="text-xs text-gray-500">Avaliou com: <span className="font-semibold">{review.rating} de 5 estrelas</span></p>
        </div>
      </div>
      <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
    </div>
    {review.comment && <p className="text-xs text-gray-600 mt-2 pl-6 italic">"{review.comment}"</p>}
  </div>
);

export default function DeliverymanEvaluationsCenter() {
  const { profile, loading: loadingProfile } = useProfile();

  // Estados para as duas seções
  const [receivedReviews, setReceivedReviews] = useState(null);
  const [loadingReceived, setLoadingReceived] = useState(true);

  const [ordersToReview, setOrdersToReview] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  const [highlightOrderId, setHighlightOrderId] = useState(null);

  // useEffect para buscar avaliações recebidas
  useEffect(() => {
    if (profile) {
      setLoadingReceived(true);
      getMyDeliveryReviews()
        .then(data => setReceivedReviews(data))
        .catch(err => console.error("Erro ao buscar avaliações recebidas:", err))
        .finally(() => setLoadingReceived(false));
    }
  }, [profile]);

  // useEffect para buscar pedidos a avaliar
  useEffect(() => {
    if (profile) {
      setLoadingOrders(true);
      getOrdersToReview()
        .then(data => setOrdersToReview(data))
        .catch(err => console.error("Erro ao buscar pedidos para avaliar:", err))
        .finally(() => setLoadingOrders(false));
    }
  }, [profile]);

  if (loadingProfile) {
    return <div>Carregando perfil...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Minhas Avaliações</h1>

      {/* Seção 1: Como você foi avaliado */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <ThumbsUp className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Como você foi avaliado</h2>
        </div>
        {loadingReceived ? (
          <p>Carregando suas avaliações...</p>
        ) : receivedReviews && receivedReviews.reviews.length > 0 ? (
          <div className="space-y-2">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold">{receivedReviews.average_rating.toFixed(1)} ⭐</p>
              <p className="text-sm text-gray-500">Média de {receivedReviews.total_reviews} avaliações</p>
            </div>
            {receivedReviews.reviews.map((review, index) => (
              <ReviewReceivedCard key={index} review={review} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma avaliação recebida ainda.</p>
        )}
      </div>

      {/* Seção 2: Avalie seus clientes */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold">Avalie seus clientes</h2>
        </div>
        {loadingOrders ? (
          <p>Carregando pedidos para avaliar...</p>
        ) : ordersToReview.length > 0 ? (
          <div className="space-y-4">
            {ordersToReview.map(order => (
              <div key={order.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">Pedido para {order.client_name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(order.completed_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => setHighlightOrderId(highlightOrderId === order.id ? null : order.id)}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                  >
                    {highlightOrderId === order.id ? 'Fechar' : 'Avaliar'}
                  </button>
                </div>
                {highlightOrderId === order.id && (
                  <div className="mt-4">
                    <ClientReviewForm
                      clientId={order.client_id}
                      orderId={order.id}
                      onSuccess={() => {
                        alert('Avaliação enviada!');
                        setHighlightOrderId(null);
                        // Recarrega a lista para remover o pedido avaliado
                        getOrdersToReview().then(setOrdersToReview);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum cliente para avaliar no momento.</p>
        )}
      </div>
    </div>
  );
}
