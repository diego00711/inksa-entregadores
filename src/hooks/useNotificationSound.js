import { useRef, useCallback } from 'react';

export function useNotificationSound() {
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    // Resume if suspended (browser policy)
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const beep = useCallback((notes, duration = 0.18, waveType = 'sine') => {
    const ctx = getCtx();
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
  }, [getCtx]);

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
