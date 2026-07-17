import { useCallback } from 'react';

// AudioContext único no módulo + desbloqueio no primeiro gesto do usuário.
// Sem isto, a política de autoplay do navegador mantém o contexto "suspended"
// e os beeps disparados por evento assíncrono (pedido chegando) ficam MUDOS.
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

// Retoma o contexto a cada gesto (cobre também o caso de ele suspender depois
// de o app ir pra segundo plano e voltar).
function bindUnlockOnce() {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;
  const unlock = () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, unlock, { passive: true })
  );
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
          // Ascending ding ×3 — attention grabbing
          beep([{ f: 523, t: 0 }, { f: 659, t: 0.2 }, { f: 784, t: 0.4 }], 0.22);
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
      // AudioContext may be blocked by browser policy
    }
  }, [beep]);

  return play;
}
