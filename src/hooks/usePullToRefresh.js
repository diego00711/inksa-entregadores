import { useState, useEffect, useRef, useCallback } from 'react';

// Áreas que ENGOLEM o arrasto e não podem virar "puxar pra atualizar".
//
// O mapa foi o primeiro caso: arrastar o mapa pra baixo (pra ver o que está ao
// norte) tem dy > 0 e window.scrollY === 0 — exatamente a assinatura de puxar a
// página. O entregador movia o mapa e a tela recarregava sozinha, no meio de
// uma entrega.
//
// Vale pra QUALQUER coisa com rolagem própria, e é por isso que a lista inclui
// [data-sem-pull]: modal com overflow-y-auto, carrossel, lista interna. Dentro
// deles o documento não rola, então window.scrollY fica 0 o tempo todo e todo
// arrasto pra baixo pareceria um puxão.
const AREAS_QUE_ARRASTAM = '.leaflet-container, [data-sem-pull]';

// Distância pra valer como puxão deliberado.
//
// Era 80px, e 80px é pouco: cabe dentro de uma rolagem normal. O padrão do
// iOS e do Android fica na casa dos 130. Subir isto sozinho não resolvia o
// problema principal (ver DESCANSO abaixo), mas 80 era metade do caminho.
const PUXAO_MINIMO = 130;

// DESCANSO — a correção que importa.
//
// Sintoma relatado pelo Diego (29/08): "rolando a página ele atualiza sem
// precisar", na tela Início do entregador.
//
// O que acontecia: a pessoa está no meio da página e arrasta pra baixo pra
// voltar ao topo. Esse primeiro arrasto é ignorado (scrollY > 0 no início do
// toque), certo. Só que a rolagem tem INÉRCIA: ela continua e para no topo. Aí
// a pessoa arrasta de novo, ainda no movimento de "voltar pra cima" — e agora
// scrollY já é 0. O hook lê aquilo como puxão e recarrega.
//
// Do lado de quem usa, a tela recarregou no meio de uma rolagem comum.
//
// A regra: um puxão só conta se a página já estiver PARADA no topo há um
// tempinho. Quem acabou de rolar não está puxando, está chegando.
const DESCANSO_MS = 450;

export function usePullToRefresh(onRefresh, { threshold = PUXAO_MINIMO, disabled = false } = {}) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const startXRef = useRef(0);
  const activatedRef = useRef(false);
  const ultimaRolagemRef = useRef(0);

  const stableRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const onScroll = () => { ultimaRolagemRef.current = Date.now(); };

    const onTouchStart = (e) => {
      // Multitoque é pinça/zoom, nunca puxão.
      if (e.touches.length !== 1) { startYRef.current = null; return; }

      // Decide NO INÍCIO do toque, não durante: uma vez que o dedo encostou no
      // mapa, todo o arrasto pertence ao mapa, mesmo que ele saia da área.
      const alvo = e.target;
      if (alvo && typeof alvo.closest === 'function' && alvo.closest(AREAS_QUE_ARRASTAM)) {
        startYRef.current = null;
        return;
      }

      // Chegou rolando? Então não é puxão. Ver DESCANSO acima.
      if (Date.now() - ultimaRolagemRef.current < DESCANSO_MS) {
        startYRef.current = null;
        return;
      }

      if (window.scrollY === 0) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e) => {
      if (startYRef.current === null || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - startYRef.current;
      const dx = Math.abs(e.touches[0].clientX - startXRef.current);

      // Arrasto na diagonal costuma ser gesto lateral (voltar, carrossel).
      // Exigir que o vertical domine evita recarregar por causa deles.
      if (dx > Math.abs(dy)) { activatedRef.current = false; setPulling(false); return; }

      if (dy > 0 && window.scrollY === 0) {
        activatedRef.current = dy >= threshold;
        setPulling(dy >= threshold / 2);
      } else {
        // Voltou pra cima ou a página saiu do topo: desarma. Sem isto, puxar,
        // desistir e soltar ainda recarregava.
        activatedRef.current = false;
        setPulling(false);
      }
    };

    const onTouchEnd = async () => {
      const recarregar = activatedRef.current;
      startYRef.current = null;
      activatedRef.current = false;
      setPulling(false);
      if (recarregar) await stableRefresh();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, threshold, stableRefresh]);

  return { pulling, refreshing };
}
