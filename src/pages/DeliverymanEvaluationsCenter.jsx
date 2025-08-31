import React, { useState } from "react";
import { Star, TrendingUp, MessageCircle, Award, Clock, User, Utensils, MapPin, DollarSign, Timer, Route } from "lucide-react";
import ClientReviewForm from "../components/ClientReviewForm";
import RestaurantReviewForm from "../components/RestaurantReviewForm";
import { useProfile } from "../context/ProfileContext";
import useDeliveredOrders from "../hooks/useDeliveredOrders";

export default function DeliverymanEvaluationsCenter() {
  const { profile, loading } = useProfile();
  const { orders, loading: loadingOrders } = useDeliveredOrders(profile?.id);
  const [highlightOrderId, setHighlightOrderId] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-orange-500 mx-auto"></div>
          <p className="text-orange-600 font-semibold mt-4">Carregando suas entregas...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="text-orange-500 text-6xl mb-4">🚛</div>
          <h2 className="text-2xl font-bold text-gray-700">Perfil não encontrado</h2>
          <p className="text-gray-500 mt-2">Entre em contato com o suporte</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50">
      {/* Header Section - Mobile Friendly */}
      <div className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-3 rounded-xl shadow-lg">
              <Star className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-800">
                Minhas Avaliações & Feedback
              </h1>
              <p className="text-gray-600 text-sm md:text-base">
                Como você está sendo avaliado como entregador!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Performance Overview Cards - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs font-medium">Média Geral</p>
                <p className="text-2xl font-bold">4.9</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                  ))}
                </div>
              </div>
              <Award className="h-6 w-6 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium">Entregas Hoje</p>
                <p className="text-2xl font-bold">12</p>
                <p className="text-blue-200 text-xs">+3 que ontem</p>
              </div>
              <Route className="h-6 w-6 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs font-medium">Tempo Médio</p>
                <p className="text-2xl font-bold">24min</p>
                <p className="text-purple-200 text-xs">Por entrega</p>
              </div>
              <Timer className="h-6 w-6 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-xs font-medium">Gorjetas Hoje</p>
                <p className="text-2xl font-bold">R$ 45</p>
                <p className="text-yellow-200 text-xs">8 gorjetas</p>
              </div>
              <DollarSign className="h-6 w-6 text-yellow-200" />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Seus números</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-orange-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-orange-600">127</p>
              <p className="text-xs text-gray-600">Entregas totais</p>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-600">96%</p>
              <p className="text-xs text-gray-600">Taxa aprovação</p>
            </div>
            <div className="text-center bg-blue-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-blue-600">18km</p>
              <p className="text-xs text-gray-600">Distância hoje</p>
            </div>
            <div className="text-center bg-purple-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-purple-600">R$ 180</p>
              <p className="text-xs text-gray-600">Ganhos hoje</p>
            </div>
          </div>
        </div>

        {/* Evaluate Section - Simplified for mobile use */}
        <div className="bg-white rounded-xl shadow-lg border border-orange-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-4 md:p-6">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-white">
                  Avalie suas entregas
                </h2>
                <p className="text-orange-100 text-sm">
                  Deixe seu feedback sobre restaurantes e clientes
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {loadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-3 text-gray-600 text-sm">Carregando entregas...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {orders?.length === 0 ? (
                  <div className="text-center py-8">
                    <Route className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-600 mb-1">
                      Nenhuma entrega para avaliar
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Complete algumas entregas para deixar avaliações
                    </p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className={`rounded-xl border-2 transition-all duration-300 ${
                        highlightOrderId === order.id
                          ? "border-orange-300 bg-orange-50 shadow-lg"
                          : "border-gray-200 bg-white hover:border-orange-200 hover:shadow-md"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-2 rounded-lg">
                              <span className="text-white font-bold text-sm">#{order.id}</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-800 text-sm md:text-base">
                                Entrega #{order.id}
                              </h3>
                              <div className="flex items-center gap-2 text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">
                                  {new Date(order.completed_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              
                              {/* Delivery Details */}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>2.3km</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  <span>22min</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span>R$ 15</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setHighlightOrderId(
                              highlightOrderId === order.id ? null : order.id
                            )}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                              highlightOrderId === order.id
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-md hover:shadow-lg"
                            }`}
                          >
                            {highlightOrderId === order.id ? "Fechar" : "Avaliar"}
                          </button>
                        </div>

                        {highlightOrderId === order.id && (
                          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Restaurant Evaluation */}
                              <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-100">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="bg-red-100 p-2 rounded-lg">
                                    <Utensils className="h-4 w-4 text-red-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-800 text-sm">
                                      Avaliar Restaurante
                                    </h4>
                                    <p className="text-gray-600 text-xs">
                                      {order.restaurant_name}
                                    </p>
                                  </div>
                                </div>
                                <RestaurantReviewForm
                                  restaurantId={order.restaurant_id}
                                  orderId={order.id}
                                  onSuccess={() => {
                                    alert("Avaliação do restaurante enviada!");
                                    setHighlightOrderId(null);
                                  }}
                                />
                              </div>

                              {/* Client Evaluation */}
                              <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-100">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="bg-blue-100 p-2 rounded-lg">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-800 text-sm">
                                      Avaliar Cliente
                                    </h4>
                                    <p className="text-gray-600 text-xs">
                                      {order.client_name}
                                    </p>
                                  </div>
                                </div>
                                <ClientReviewForm
                                  clientId={order.client_id}
                                  orderId={order.id}
                                  onSuccess={() => {
                                    alert("Avaliação do cliente enviada!");
                                    setHighlightOrderId(null);
                                  }}
                                />
                              </div>
                            </div>
                            
                            {/* Quick Action Buttons */}
                            <div className="flex gap-2 pt-2 border-t border-orange-200">
                              <button 
                                onClick={() => {
                                  alert("Ambas avaliações enviadas!");
                                  setHighlightOrderId(null);
                                }}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                              >
                                ✅ Avaliar Ambos (Positivo)
                              </button>
                              <button 
                                onClick={() => setHighlightOrderId(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg text-sm transition-colors"
                              >
                                Pular
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tips for Deliveryman */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💡</span>
            <h3 className="font-semibold text-blue-800">Dicas para manter boa avaliação:</h3>
          </div>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Seja educado e pontual nas entregas</li>
            <li>• Mantenha a bag térmica sempre limpa</li>
            <li>• Confirme o endereço antes de sair</li>
            <li>• Use uniforme limpo e identificação visível</li>
            <li>• Comunique-se caso haja atrasos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
