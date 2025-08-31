import React, { useState } from "react";
import { Star, TrendingUp, MessageCircle, Award, Clock, User, Truck } from "lucide-react";
import RestaurantReviewsList from "../components/RestaurantReviewsList";
import ClientReviewForm from "../components/ClientReviewForm";
import DeliveryReviewForm from "../components/DeliveryReviewForm";
import { useProfile } from "../context/ProfileContext";
import useDeliveredOrders from "../hooks/useDeliveredOrders";

export default function RestaurantEvaluationsCenter() {
  const { profile, loading } = useProfile();
  const { orders, loading: loadingOrders } = useDeliveredOrders(profile?.id);
  const [highlightOrderId, setHighlightOrderId] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-700">Perfil não encontrado</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-100 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-3 rounded-xl shadow-lg">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Central de Avaliações & Feedback
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie e monitore as avaliações do seu restaurante
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Performance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Avaliações Recentes</p>
                <p className="text-3xl font-bold">24</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Média Geral</p>
                <p className="text-3xl font-bold">4.8</p>
              </div>
              <Star className="h-8 w-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Pendentes</p>
                <p className="text-3xl font-bold">{orders?.length || 0}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Restaurant Reviews Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">
                Como seu restaurante está sendo avaliado?
              </h2>
            </div>
            <p className="text-orange-100 mt-2">
              Acompanhe o feedback dos seus clientes
            </p>
          </div>
          <div className="p-6">
            <RestaurantReviewsList restaurantId={profile.id} />
          </div>
        </div>

        {/* Evaluate Clients and Delivery Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">
                Avalie seus clientes e entregadores
              </h2>
            </div>
            <p className="text-emerald-100 mt-2">
              Valorize a experiência avaliando quem faz parte do seu negócio
            </p>
          </div>

          <div className="p-6">
            {loadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                <span className="ml-4 text-gray-600">Carregando pedidos entregues...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {orders?.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      Nenhum pedido para avaliar
                    </h3>
                    <p className="text-gray-500">
                      Quando você tiver pedidos entregues, eles aparecerão aqui
                    </p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 transition-all duration-300 ${
                        highlightOrderId === order.id
                          ? "border-emerald-300 shadow-lg scale-[1.02]"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                      }`}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-xl">
                              <span className="text-white font-bold">#{order.id}</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">
                                Pedido #{order.id}
                              </h3>
                              <div className="flex items-center gap-2 text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm">
                                  {new Date(order.completed_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setHighlightOrderId(
                              highlightOrderId === order.id ? null : order.id
                            )}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                              highlightOrderId === order.id
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                            }`}
                          >
                            {highlightOrderId === order.id ? "Cancelar" : "Avaliar agora"}
                          </button>
                        </div>

                        {highlightOrderId === order.id && (
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 mt-6 space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Client Evaluation */}
                              <div className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="bg-blue-100 p-2 rounded-lg">
                                    <User className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-800">
                                      Avaliar Cliente
                                    </h4>
                                    <p className="text-gray-600 text-sm">
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

                              {/* Deliveryman Evaluation */}
                              <div className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="bg-orange-100 p-2 rounded-lg">
                                    <Truck className="h-5 w-5 text-orange-600" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-800">
                                      Avaliar Entregador
                                    </h4>
                                    <p className="text-gray-600 text-sm">
                                      {order.deliveryman_name}
                                    </p>
                                  </div>
                                </div>
                                <DeliveryReviewForm
                                  deliverymanId={order.deliveryman_id}
                                  orderId={order.id}
                                  onSuccess={() => {
                                    alert("Avaliação do entregador enviada!");
                                    setHighlightOrderId(null);
                                  }}
                                />
                              </div>
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
      </div>
    </div>
  );
}
