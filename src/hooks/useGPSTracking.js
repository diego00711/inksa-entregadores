import { useEffect, useRef, useCallback } from 'react';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';

export function useGPSTracking({ enabled = false, onPositionUpdate } = {}) {
  const watchIdRef = useRef(null);
  const lastRef = useRef(null);
  const pendingRef = useRef(false);

  const pushLocation = useCallback(async (lat, lng) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    try {
      await fetch(`${DELIVERY_API_URL}/api/delivery/location`, {
        method: 'PATCH',
        headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      onPositionUpdate?.({ lat, lng });
    } catch {
      // silent – GPS updates are best-effort
    } finally {
      pendingRef.current = false;
    }
  }, [onPositionUpdate]);

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current != null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.warn('[useGPSTracking] geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        const last = lastRef.current;
        // Skip if moved less than ~10 m (0.0001° ≈ 11 m)
        if (last && Math.abs(lat - last.lat) < 0.0001 && Math.abs(lng - last.lng) < 0.0001) return;
        lastRef.current = { lat, lng };
        pushLocation(lat, lng);
      },
      (err) => console.warn('[useGPSTracking]', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, pushLocation]);
}
