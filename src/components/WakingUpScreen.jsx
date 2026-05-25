import { useState, useEffect, useRef, useCallback } from 'react';

const HEALTH_URL = `${import.meta.env.VITE_DELIVERY_API_URL || import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com'}/api/health`;
const SLOW_MS = 3000;
const SECONDARY_MS = 5000;
const RETRY_MS = 60000;

export default function WakingUpScreen({ onReady }) {
  const [phase, setPhase] = useState('checking');
  const [showSecondary, setShowSecondary] = useState(false);
  const abortRef = useRef(null);

  const doCheck = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase('checking');
    setShowSecondary(false);

    const t1 = setTimeout(() => setPhase('slow'), SLOW_MS);
    const t2 = setTimeout(() => setShowSecondary(true), SECONDARY_MS);
    const t3 = setTimeout(() => setPhase('retry'), RETRY_MS);

    fetch(HEALTH_URL, { signal: ctrl.signal, cache: 'no-store' })
      .then(res => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
        if (res.ok) { onReady(); } else { setPhase('retry'); }
      })
      .catch(err => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
        if (!ctrl.signal.aborted) setPhase('retry');
      });
  }, [onReady]);

  useEffect(() => {
    // Fallback: após 8s chama onReady() independente do resultado do health check
    const fallbackTimer = setTimeout(() => onReady(), 8000);
    doCheck();
    return () => {
      abortRef.current?.abort();
      clearTimeout(fallbackTimer);
    };
  }, [doCheck, onReady]);

  if (phase === 'checking') return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="text-center max-w-xs px-6">
        <div className="text-6xl mb-4 animate-bounce select-none">☕</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Nossos servidores estão acordando...
        </h2>
        <p className="text-gray-500 text-sm mb-6">Aguarde um momento.</p>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
          <div className="h-1.5 bg-orange-500 rounded-full waking-bar" />
        </div>
        {showSecondary && (
          <p className="text-gray-400 text-xs mb-4">
            Pode demorar até 30 segundos na primeira vez.
          </p>
        )}
        {phase === 'retry' && (
          <button
            onClick={doCheck}
            className="mt-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
      <style>{`
        .waking-bar { animation: waking 1.5s ease-in-out infinite; width: 40%; }
        @keyframes waking { 0% { transform: translateX(-150%); } 100% { transform: translateX(350%); } }
      `}</style>
    </div>
  );
}
