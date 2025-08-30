import React, { useState } from "react";
import RestaurantReviewForm from "../components/RestaurantReviewForm";
import ClientReviewForm from "../components/ClientReviewForm";
import useDeliveredOrders from "../hooks/useDeliveredOrders";
import { useProfile } from "../context/DeliveryProfileContext"; // Corrigido para usar o contexto do entregador

export default function DeliverymanEvaluationsCenter() {
  const { profile } = useProfile(); // Corrigido para pegar o perfil do entregador
  const { orders, loading } = useDeliveredOrders(profile?.id, "deliveryman");
  const [highlightOrderId, setHighlightOrderId] = useState(null);

  return (
    <div style={{padding: 24, background: "#f0f8ff"}}>
      <h1 className="text-2xl font-bold mb-4">Minhas Avaliações & Feedback (Entregador)</h1>
      <section style={{background:"#e1f4ff",padding:16,borderRadius:8,marginBottom:32}}>
        <h2 className="text-xl font-bold mb-2">Como você está sendo avaliado?</h2>
        <div style={{color: "#888"}}>Em breve: avaliações recebidas como entregador!</div>
      </section>
      <section style={{background:"#e1ffe6",padding:16,borderRadius:8}}>
        <h2 className="text-xl font-bold mb-2">Avalie clientes e restaurantes</h2>
        {loading ? (
          <div>Carregando entregas concluídas...</div>
        ) : (
          <ul style={{listStyle:"none",padding:0}}>
            {orders.map(order => (
              <li key={order.id} style={{
                border:"1px solid #eee", margin:"1em 0", padding:16, borderRadius:8, background: highlightOrderId===order.id ? '#e6f7ff' : '#fff'
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <strong>Entrega #{order.id}</strong> <br />
                    <small>Data: {new Date(order.completed_at).toLocaleDateString()}</small>
                  </div>
                  <button
                    style={{background:"#0099ff",color:"#fff",padding:"6px 12px",border:"none",borderRadius:4,cursor:"pointer"}}
                    onClick={()=>setHighlightOrderId(order.id)}
                  >
                    Avaliar agora
                  </button>
                </div>
                {highlightOrderId===order.id && (
                  <div style={{marginTop:16,display:"flex",gap:32}}>
                    <div>
                      <div><b>Restaurante:</b> {order.restaurant_name}</div>
                      <RestaurantReviewForm
                        restaurantId={order.restaurant_id}
                        orderId={order.id}
                        onSuccess={() => {
                          alert("Avaliação do restaurante enviada!");
                          setHighlightOrderId(null);
                        }}
                      />
                    </div>
                    <div>
                      <div><b>Cliente:</b> {order.client_name}</div>
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
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
