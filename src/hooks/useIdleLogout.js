import { useEffect, useRef } from 'react';

// Desloga o usuário após `timeoutMs` sem NENHUMA interação (toque, clique,
// tecla, rolagem). Usa um timestamp + checagem periódica em vez de um
// setTimeout único — assim aguenta melhor o app ir pra segundo plano (o
// navegador/WebView estrangula timers longos em background).
//
// `onIdle` é lido via ref, então não precisa ser memoizado pelo chamador.
export function useIdleLogout({ timeoutMs, onIdle, enabled = true }) {
  const lastActivity = useRef(Date.now());
  const fired = useRef(false);
  const cb = useRef(onIdle);
  cb.current = onIdle;

  useEffect(() => {
    if (!enabled || !timeoutMs) return undefined;

    const bump = () => { lastActivity.current = Date.now(); };
    const events = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll', 'wheel'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const onVisible = () => { if (document.visibilityState === 'visible') bump(); };
    document.addEventListener('visibilitychange', onVisible);

    const id = setInterval(() => {
      if (fired.current) return;
      if (Date.now() - lastActivity.current >= timeoutMs) {
        fired.current = true;
        try { cb.current(); } catch (_e) { /* ignore */ }
      }
    }, 30000); // checa a cada 30s

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, [timeoutMs, enabled]);
}

export default useIdleLogout;
