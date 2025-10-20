// src/pages/DeliverymanEvaluationsCenter.jsx - VERSÃO ATUALIZADA

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageSquare, User, Clock, Award, TrendingUp } from 'lucide-react';
import { useProfile } from '../context/DeliveryProfileContext'; // Ajuste o caminho conforme necessário
import { getMyDeliveryReviews } from '../services/reviewService';
import useDeliveredOrders from '../hooks/useDeliveredOrders';
import ClientReviewForm from '../components/ClientReviewForm';

// Card para uma avaliação recebida (com mais estilo)
const ReviewReceivedCard = ({ review }) => (
  <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2 rounded-full">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{review.reviewer_name || 'Cliente Anônimo'}</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}
          </div>
        </div>
      </div>
      <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
    </div>
    {review.comment && <p className="text-sm text-gray-700 mt-2 pl-10 italic">"{review.comment}"</p>}
  </div>
);

export default function DeliverymanEvaluationsCenter() {
  const { profile, loading: loadingProfile } = useProfile();
  const [receivedReviews, setReceivedReviews] = useState(null);
  const [loadingReceived, setLoadingReceived] = useState(true);
  
  // ✅ CORREÇÃO: Adiciona refetch ao hook
  const { orders: ordersToReview, loading: loadingOrders, refetch } = useDeliveredOrders(profile?.id);
  
  const [highlightOrderId, setHighlightOrderId] = useState(null);

  useEffect(() => {
    if (profile) {
      setLoadingReceived(true);
      getMyDeliveryReviews()
        .then(data => setReceivedReviews(data))
        .catch(err => console.error("Erro ao buscar avaliações recebidas:", err))
        .finally(() => setLoadingReceived(false));
    }
  }, [profile]);

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Minhas Avaliações</h1>
          <p className="text-gray-500 mt-1">Veja seu desempenho e avalie seus clientes.</p>
        </div>

        {/* Seção 1: Como você foi avaliado */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Seu Desempenho</h2>
            </div>
          </div>
          <div className="p-6">
            {loadingReceived ? (
              <p className="text-center text-gray-500">Carregando suas avaliações...</p>
            ) : receivedReviews && receivedReviews.reviews.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center mb-6">
                  <div>
                    <p className="text-4xl font-bold text-indigo-600">{receivedReviews.average_rating.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">Média Geral</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-indigo-600">{receivedReviews.total_reviews}</p>
                    <p className="text-sm text-gray-500">Total de Avaliações</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {receivedReviews.reviews.map((review, index) => (
                    <ReviewReceivedCard key={index} review={review} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhuma avaliação recebida ainda.</p>
            )}
          </div>
        </div>

        {/* Seção 2: Avalie seus clientes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Avaliações Pendentes</h2>
            </div>
          </div>
          <div className="p-6">
            {loadingOrders ? (
              <p className="text-center text-gray-500">Carregando pedidos para avaliar...</p>
            ) : ordersToReview?.length > 0 ? (
              <div className="space-y-4">
                {ordersToReview.map(order => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">Pedido para {order.client_name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          Entregue em: {new Date(order.delivered_at || order.completed_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button
                        onClick={() => setHighlightOrderId(highlightOrderId === order.id ? null : order.id)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          highlightOrderId === order.id
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
                        }`}
                      >
                        {highlightOrderId === order.id ? 'Fechar' : 'Avaliar'}
                      </button>
                    </div>
                    {highlightOrderId === order.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <ClientReviewForm
                          clientId={order.client_id}
                          orderId={order.id}
                          onSuccess={() => {
                            alert('Avaliação enviada com sucesso!');
                            setHighlightOrderId(null);
                            refetch(); // ✅ ATUALIZA A LISTA
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhum cliente para avaliar no momento. Bom trabalho!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
