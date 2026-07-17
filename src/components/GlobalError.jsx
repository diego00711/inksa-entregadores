import { useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

// Cortina de "serviço indisponível" (z-9999, cobre o app INTEIRO).
// Antes: QUALQUER fetch que falhasse (um piscar de wifi, um timeout) disparava
// 'network:error' e a cortina subia por cima do app, saindo só com reload
// manual — mesma família da "tela em branco" do E2E no app do cliente.
// Agora: só sobe com queda CONFIRMADA por ping de saúde, se auto-recupera a
// cada 4s quando o servidor volta, e o botão verifica sem recarregar a página.
export default function GlobalError() {
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);

  const pingServer = async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(`${API}/healthz`, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      return r.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const onNetworkError = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      const ok = await pingServer();
      checkingRef.current = false;
      if (!ok) setVisible(true); // só cobre o app com queda CONFIRMADA
    };
    window.addEventListener('network:error', onNetworkError);
    return () => window.removeEventListener('network:error', onNetworkError);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(async () => {
      if (await pingServer()) setVisible(false);
    }, 4000);
    return () => clearInterval(id);
  }, [visible]);

  const retryNow = async () => {
    setChecking(true);
    const ok = await pingServer();
    setChecking(false);
    if (ok) setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="text-7xl mb-6">🔌</div>
      <h1 className="text-2xl font-black text-gray-800 mb-2">Serviço temporariamente indisponível</h1>
      <p className="text-gray-500 mb-8 max-w-xs text-sm">
        Não foi possível conectar ao servidor. Reconectando automaticamente…
      </p>
      <button
        onClick={retryNow}
        disabled={checking}
        className="bg-[#FF6F00] text-white font-bold px-8 py-3 rounded-full text-lg hover:bg-orange-600 transition-colors shadow-lg disabled:opacity-60"
      >
        {checking ? 'Verificando…' : 'Tentar novamente'}
      </button>
    </div>
  );
}
