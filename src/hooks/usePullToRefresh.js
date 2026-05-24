import { useState, useEffect, useRef, useCallback } from 'react';

export function usePullToRefresh(onRefresh, { threshold = 80, disabled = false } = {}) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const activatedRef = useRef(false);

  const stableRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;
    const onTouchStart = (e) => {
      if (window.scrollY === 0) startYRef.current = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (startYRef.current === null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0 && window.scrollY === 0) {
        activatedRef.current = dy >= threshold;
        setPulling(dy >= threshold / 2);
      }
    };
    const onTouchEnd = async () => {
      if (activatedRef.current) await stableRefresh();
      startYRef.current = null;
      activatedRef.current = false;
      setPulling(false);
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, threshold, stableRefresh]);

  return { pulling, refreshing };
}
