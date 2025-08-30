import { useEffect, useState } from "react";

export default function useDeliveredOrders(userId, role = "client") {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    if (role === "deliveryman") {
      setTimeout(() => {
        setOrders([
          {
            id: 301,
            restaurant_id: 21,
            restaurant_name: "Cantina do Zé",
            client_id: 401,
            client_name: "Maria da Silva",
            completed_at: Date.now() - 86400000,
          },
        ]);
        setLoading(false);
      }, 600);
    } else {
      // ...caso "client"
    }
  }, [userId, role]);

  return { orders, loading };
}
