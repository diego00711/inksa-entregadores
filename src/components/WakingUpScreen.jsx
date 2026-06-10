import { useEffect, useRef, useState } from 'react';

// Endpoint leve do backend (só confirma que o processo web está de pé — sem DB).
const API = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
const MAX_WAIT_MS = 60000; // não prende o usuário para sempre

export default function WakingUpScreen({ onReady }) {
  const [slow, setSlow] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let alive = true;
    const start = Date.now();

    const finish = () => {
      if (done.current || !alive) return;
      done.current = true;
      onReady();
    };

    const ping = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch(`${API}/healthz`, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(t);
        if (r.ok) return finish();
      } catch {
        /* backend ainda acordando — tenta de novo */
      }
      if (!alive || done.current) return;
      const elapsed = Date.now() - start;
      if (elapsed > 4000) setSlow(true);
      if (elapsed > MAX_WAIT_MS) return finish();
      setTimeout(ping, 1500);
    };

    ping();
    return () => { alive = false; };
  }, [onReady]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="text-center max-w-xs px-6">
        <div className="text-6xl mb-4 animate-bounce select-none">☕</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Carregando...</h2>
        <p className="text-gray-500 text-sm mb-6">
          {slow ? 'Iniciando o servidor, só um instante...' : 'Só um momento.'}
        </p>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-1.5 bg-orange-500 rounded-full waking-bar" />
        </div>
      </div>
      <style>{`
        .waking-bar { animation: waking 1.5s ease-in-out infinite; width: 40%; }
        @keyframes waking { 0% { transform: translateX(-150%); } 100% { transform: translateX(350%); } }
      `}</style>
    </div>
  );
}
