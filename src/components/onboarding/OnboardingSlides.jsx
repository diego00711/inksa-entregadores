// src/components/onboarding/OnboardingSlides.jsx
// Controle via localStorage: chave "inksa_onboarding_done"
// Exibir se localStorage.getItem('inksa_onboarding_done') !== 'true'
// Ao concluir/pular: localStorage.setItem('inksa_onboarding_done', 'true')

import React, { useState } from 'react';

const SLIDES = [
  {
    emoji: '🛵',
    title: 'Entregas no seu ritmo',
    desc: 'Aceite entregas quando e onde quiser',
  },
  {
    emoji: '💰',
    title: 'Ganhos transparentes',
    desc: 'Acompanhe seus ganhos em tempo real',
  },
  {
    emoji: '🏆',
    title: 'Suba no ranking',
    desc: 'Quanto mais entregas, maiores os benefícios',
  },
];

export default function OnboardingSlides({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  const finish = () => {
    localStorage.setItem('inksa_onboarding_done', 'true');
    onComplete();
  };

  const next = () => {
    if (current < SLIDES.length - 1) {
      setVisible(false);
      setTimeout(() => {
        setCurrent((c) => c + 1);
        setVisible(true);
      }, 300);
    } else {
      finish();
    }
  };

  const skip = () => {
    finish();
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-between py-12 px-6">
      {/* Skip button — top right, hidden on last slide */}
      <div className="w-full flex justify-end min-h-[32px]">
        {!isLast && (
          <button
            onClick={skip}
            className="text-gray-400 text-sm font-medium"
            aria-label="Pular onboarding"
          >
            Pular
          </button>
        )}
      </div>

      {/* Slide content */}
      <div
        className={`flex flex-col items-center flex-1 justify-center transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-8xl mb-8 select-none" role="img" aria-label={slide.title}>
          {slide.emoji}
        </span>
        <h2 className="text-2xl font-bold text-[#FF6F00] text-center mb-4">
          {slide.title}
        </h2>
        <p className="text-gray-600 text-center px-8 text-base leading-relaxed">
          {slide.desc}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center space-x-2 mb-8">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              i === current ? 'bg-[#FF6F00]' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Action button */}
      <button
        onClick={next}
        className="bg-[#FF6F00] text-white rounded-full min-h-[44px] w-full max-w-xs font-semibold text-base transition-opacity hover:opacity-90 active:opacity-80"
      >
        {isLast ? 'Começar' : 'Próximo'}
      </button>
    </div>
  );
}
