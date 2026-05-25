import { useEffect } from 'react';

export default function WakingUpScreen({ onReady }) {
  useEffect(() => {
    const timer = setTimeout(() => onReady(), 3000);
    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="text-center max-w-xs px-6">
        <div className="text-6xl mb-4 animate-bounce select-none">☕</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Carregando...
        </h2>
        <p className="text-gray-500 text-sm mb-6">Só um momento.</p>
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
