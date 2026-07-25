import { useEffect, useState } from 'react';
import DeliveryService from '../services/deliveryService';
import { useNotificationSound } from './useNotificationSound';

// Alarme de novo pedido GLOBAL: toca em QUALQUER tela enquanto o entregador
// estiver online e houver pedido disponível. Vive no DeliveryPortalLayout (que
// fica sempre montado), não numa página — antes só tocava na tela Início porque
// o efeito morava lá; ao trocar de aba, ficava mudo.
export function useNewOrderAlarm(enabled) {
  const play = useNotificationSound();
  const [hasAvailable, setHasAvailable] = useState(false);

  // Poll leve da contagem de disponíveis enquanto online
  useEffect(() => {
    if (!enabled) { setHasAvailable(false); return; }
    let alive = true;
    const check = async () => {
      try {
        const data = await DeliveryService.getAvailableDeliveries();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        if (alive) setHasAvailable(list.length > 0);
      } catch {
        /* silencioso — sem net, não alarma */
      }
    };
    check();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') check();
    }, 20000);
    return () => { alive = false; clearInterval(id); };
  }, [enabled]);

  // Repete o som a cada 5s enquanto houver pedido (até alguém aceitar / ficar
  // offline). Depende do BOOLEANO (não da contagem) pra a cadência ficar estável.
  useEffect(() => {
    if (!enabled || !hasAvailable) return;
    play('new_order');
    const id = setInterval(() => play('new_order'), 5000);
    return () => clearInterval(id);
  }, [enabled, hasAvailable, play]);
}

export default useNewOrderAlarm;
