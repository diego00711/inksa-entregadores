import { useCallback, useEffect, useRef } from 'react';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';

/**
 * Envia a posição do entregador para o pedido que ele está entregando.
 *
 * POR QUE ISTO VIROU HOOK (e não ficou colado numa tela)
 *
 * Esta lógica morava DENTRO do DeliveryDashboard. Só que a entrega é
 * acompanhada no MyDeliveriesPage — é lá que fica o mapa e é lá que o
 * entregador passa a corrida inteira. Com o efeito montado só no Dashboard,
 * ele nem existia durante a entrega: nenhuma posição era enviada.
 *
 * O resultado apareceu no primeiro pedido real (29/08/2026): a tabela
 * `delivery_tracking` tinha UMA linha em toda a base, do pedido errado,
 * gravada três minutos DEPOIS de ele já ter sido entregue. E, do outro lado,
 * o mapa do cliente nunca teve um entregador pra mostrar.
 *
 * Como hook, as duas telas usam a MESMA regra. Se um dia aparecer uma
 * terceira tela de entrega, ela também usa esta — que é o oposto do que
 * aconteceu com o preço no payment.py, onde a mesma regra escrita duas vezes
 * virou duas regras diferentes.
 *
 * O QUE FAZ A POSIÇÃO COMEÇAR A SER ENVIADA
 *
 * O pedido precisa estar em `delivering`, e quem coloca ele nesse estado é o
 * RESTAURANTE, digitando o código de retirada do entregador. Ou seja: se a
 * loja demora pra confirmar o código, o entregador já está na rua e o
 * rastreamento ainda não começou. Isso não é defeito deste arquivo, é do
 * fluxo — mas é aqui que se sente.
 */
export function useOrderTracking(activeOrders) {
  const intervalRef = useRef(null);
  const watchIdRef = useRef(null);
  const trackedOrderIdRef = useRef(null);

  // Throttle: o watchPosition dispara a cada tremida do GPS (indoor, com
  // enableHighAccuracy, são várias por segundo). Sem filtro isso sozinho
  // estourava o rate limit e derrubava o app com 429. Só envia se moveu ~11m
  // OU passaram 8s desde o último envio — o interval de 10s garante o
  // batimento mínimo com o entregador parado no semáforo.
  const lastSentRef = useRef({ lat: null, lng: null, t: 0 });

  const enviar = useCallback((latitude, longitude, orderId) => {
    const agora = Date.now();
    const ult = lastSentRef.current;
    if (ult.lat != null) {
      const andouLonge =
        Math.abs(latitude - ult.lat) >= 0.0001 || Math.abs(longitude - ult.lng) >= 0.0001;
      if (agora - ult.t < 8000 && !andouLonge) return;
    }
    lastSentRef.current = { lat: latitude, lng: longitude, t: agora };
    fetch(`${DELIVERY_API_URL}/api/deliveries/${orderId}/location`, {
      method: 'PATCH',
      headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    }).catch(() => {}); // falha silenciosa: perder um ponto não atrapalha a entrega
  }, []);

  const parar = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    trackedOrderIdRef.current = null;
  }, []);

  useEffect(() => {
    const lista = Array.isArray(activeOrders) ? activeOrders : [];
    // 'picked_up' e 'on_the_way' não existem no vocabulário do backend
    // (ver STATUS_DISPLAY_MAP em orders.py) — ficam aqui só por segurança,
    // caso alguma tela antiga ainda produza esses valores localmente.
    const emRota = lista.find((o) =>
      ['delivering', 'picked_up', 'on_the_way'].includes(o?.status));
    const orderId = emRota?.id;

    if (trackedOrderIdRef.current && trackedOrderIdRef.current !== orderId) parar();
    if (!orderId) { parar(); return undefined; }
    if (watchIdRef.current != null) return undefined;

    trackedOrderIdRef.current = orderId;

    watchIdRef.current = navigator.geolocation?.watchPosition(
      (pos) => enviar(pos.coords.latitude, pos.coords.longitude, orderId),
      (err) => console.warn('[rastreio] GPS negado ou indisponível:', err?.message),
      { enableHighAccuracy: true, maximumAge: 5000 },
    ) ?? null;

    // Rede de segurança: garante um envio a cada 10s mesmo parado.
    intervalRef.current = setInterval(() => {
      navigator.geolocation?.getCurrentPosition(
        (pos) => enviar(pos.coords.latitude, pos.coords.longitude, orderId),
        () => {},
      );
    }, 10000);

    return parar;
  }, [activeOrders, enviar, parar]);
}
