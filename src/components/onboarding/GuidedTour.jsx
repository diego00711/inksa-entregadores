// src/components/onboarding/GuidedTour.jsx
// Controle via localStorage: chave "inksa_tour_done"
// Ao concluir/pular: localStorage.setItem('inksa_tour_done', 'true')

import React, { useState } from 'react';

const STEPS = [
  {
    title: 'Entregas disponíveis',
    desc: 'Aqui você vê todas as entregas disponíveis para aceitar',
  },
  {
    title: 'Aceitar entrega',
    desc: 'Toque no botão para aceitar uma entrega e começar a ganhar',
  },
  {
    title: 'Seus ganhos',
    desc: 'Acompanhe seus ganhos diários e histórico de entregas',
  },
];

export default function GuidedTour({ onComplete }) {
  const [current, setCurrent] = useState(0);

  const finish = () => {
    localStorage.setItem('inksa_tour_done', 'true');
    onComplete();
  };

  const next = () => {
    if (current < STEPS.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      finish();
    }
  };

  const skip = () => {
    finish();
  };

  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 z-40 bg-black/60" aria-hidden="true" />

      {/* Tooltip fixo centro-inferior */}
      <div className="fixed bottom-8 left-4 right-4 bg-white rounded-2xl shadow-2xl p-5 z-50 max-w-sm mx-auto">
        <p className="font-bold text-lg text-gray-900">{step.title}</p>
        <p className="text-gray-600 text-sm mt-1">{step.desc}</p>
        <p className="text-xs text-gray-400 mt-3">
          Passo {current + 1} de {STEPS.length}
        </p>

        <div className="flex items-center justify-between mt-4 gap-3">
          <button
            onClick={skip}
            className="text-gray-400 text-sm font-medium flex-shrink-0"
          >
            Pular tour
          </button>
          <button
            onClick={next}
            className="bg-[#FF6F00] text-white rounded-full px-6 py-2 text-sm font-semibold min-h-[40px] transition-opacity hover:opacity-90 active:opacity-80"
          >
            {isLast ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </>
  );
}
