import { useState, useEffect, useRef, useCallback } from 'react';

// Áreas que ENGOLEM o arrasto e não podem virar "puxar pra atualizar".
//
// O mapa é o caso que quebrou: arrastar o mapa pra baixo (pra ver o que está
// ao norte) tem dy > 0 e window.scrollY === 0 — exatamente a assinatura de
// puxar a página. O entregador movia o mapa e a tela recarregava sozinha,
// no meio de uma entrega. Reportado pelo Diego em pedido de teste real.
//
// Vale pra qualquer coisa com rolagem própria, por isso a lista inclui
// [data-sem-pull]: quem tiver o mesmo problema depois marca o container e
// pronto, sem mexer neste hook de novo.
const AREAS_QUE_ARRASTAM = '.leaflet-container, [data-sem-pull]';

export function usePullToRefresh(onRefresh, { threshold = 80, disabled = false } = {}) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const activatedRef = useRef(false);

  const stableRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;
    const onTouchStart = (e) => {
      // Decide NO INÍCIO do toque, não durante: uma vez que o dedo encostou no
      // mapa, todo o arrasto pertence ao mapa, mesmo que ele saia da área.
      const alvo = e.target;
      if (alvo && typeof alvo.closest === 'function' && alvo.closest(AREAS_QUE_ARRASTAM)) {
        startYRef.current = null;
        return;
      }
      if (window.scrollY === 0) startYRef.current = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (startYRef.current === null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0 && window.scrollY === 0) {
        activatedRef.current = dy >= threshold;
        setPulling(dy >= threshold / 2);
      }
    };
    const onTouchEnd = async () => {
      if (activatedRef.current) await stableRefresh();
      startYRef.current = null;
      activatedRef.current = false;
      setPulling(false);
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, threshold, stableRefresh]);

  return { pulling, refreshing };
}
