import { useState, useEffect } from 'react';

export default function GlobalError() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener('network:error', show);
    return () => window.removeEventListener('network:error', show);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="text-7xl mb-6">🔌</div>
      <h1 className="text-2xl font-black text-gray-800 mb-2">Serviço temporariamente indisponível</h1>
      <p className="text-gray-500 mb-8 max-w-xs text-sm">
        Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.
      </p>
      <button
        onClick={() => { setVisible(false); window.location.reload(); }}
        className="bg-[#FF6F00] text-white font-bold px-8 py-3 rounded-full text-lg hover:bg-orange-600 transition-colors shadow-lg"
      >
        Tentar novamente
      </button>
    </div>
  );
}
