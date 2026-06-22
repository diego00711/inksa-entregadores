// Vibração háptica para ações táteis no mobile.
// Respeita prefers-reduced-motion e silencia em desktops sem suporte.

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function vibrate(pattern) {
  if (reduceMotion) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch { /* noop */ }
}

export const haptics = {
  tap:     () => vibrate(15),
  success: () => vibrate([20, 50, 30]),
  warn:    () => vibrate([40, 60, 40]),
  error:   () => vibrate([80, 40, 80, 40, 80]),
  notify:  () => vibrate([30, 60, 30, 60, 80]),
};
