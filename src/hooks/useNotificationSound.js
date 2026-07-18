import { useCallback } from 'react';

// Som de notificação "estilo Inksa": jingle (Web Audio) + voz falando a marca
// (speechSynthesis / TTS do navegador em pt-BR). Sem depender de arquivo.
//
// AudioContext único no módulo + desbloqueio no primeiro gesto do usuário —
// sem isto a política de autoplay mantém o áudio "suspended" e o alerta
// disparado por evento assíncrono (pedido chegando) fica MUDO.
let audioCtx = null;
let unlockBound = false;

function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function bindUnlockOnce() {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;
  const unlock = () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    // prime o TTS também (também exige gesto em alguns navegadores)
    try { window.speechSynthesis && window.speechSynthesis.resume(); } catch {}
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, unlock, { passive: true })
  );
}

// Fala a marca em pt-BR. Degrada sem erro se o aparelho não tiver TTS.
function speakInksa(text) {
  try {
    const synth = typeof window !== 'undefined' && window.speechSynthesis;
    if (!synth) return;
    if (synth.speaking || synth.pending) return; // não empilha a cada 5s
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = 1.02;
    u.pitch = 1.05;
    u.volume = 1;
    const voices = synth.getVoices ? synth.getVoices() : [];
    const ptVoice = voices.find((v) => /pt[-_]?br/i.test(v.lang)) || voices.find((v) => /^pt/i.test(v.lang));
    if (ptVoice) u.voice = ptVoice;
    synth.speak(u);
  } catch {
    // sem TTS: fica só o jingle
  }
}

export function useNotificationSound() {
  // liga o desbloqueio na 1ª vez que algum componente usa o hook
  bindUnlockOnce();

  const beep = useCallback((notes, duration = 0.18, waveType = 'sine') => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    notes.forEach(({ f, t = 0 }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = waveType;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.25, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + duration);
      osc.start(now + t);
      osc.stop(now + t + duration + 0.02);
    });
  }, []);

  const play = useCallback((event = 'new_order') => {
    try {
      switch (event) {
        case 'new_order':
          // Jingle "Inksa": arpejo ascendente quentinho + oitava de acento…
          beep([
            { f: 523, t: 0 },     // C5
            { f: 659, t: 0.12 },  // E5
            { f: 784, t: 0.24 },  // G5
            { f: 1047, t: 0.38 }, // C6
          ], 0.26, 'triangle');
          // …e a voz da marca logo após o jingle
          setTimeout(() => speakInksa('Nova entrega na Inksa!'), 680);
          break;
        case 'accepted':
          beep([{ f: 440, t: 0 }, { f: 554, t: 0.12 }, { f: 659, t: 0.24 }], 0.28);
          break;
        case 'out_for_delivery':
          beep([{ f: 330, t: 0 }, { f: 440, t: 0.16 }, { f: 660, t: 0.32 }], 0.2, 'triangle');
          break;
        case 'delivered':
          beep([
            { f: 523, t: 0 }, { f: 659, t: 0.12 },
            { f: 784, t: 0.24 }, { f: 1047, t: 0.36 },
          ], 0.3);
          break;
        default:
          beep([{ f: 440, t: 0 }], 0.15);
      }
    } catch {
      // AudioContext blocked by browser policy
    }
  }, [beep]);

  return play;
}
