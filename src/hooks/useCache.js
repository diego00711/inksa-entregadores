import { useState, useEffect, useRef, useCallback } from 'react';

const _cache = new Map();

/**
 * Stale-while-revalidate data fetching with in-memory TTL cache.
 *
 * @param {string} key      - Unique cache key
 * @param {Function} fetcher - Async function that returns data
 * @param {{ ttl?: number }} opts - ttl in ms (default 120 000 = 2 min)
 */
export function useCache(key, fetcher, { ttl = 120_000 } = {}) {
  const [state, setState] = useState(() => {
    const hit = _cache.get(key);
    return { data: hit?.data ?? null, loading: !hit, error: null };
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(
    async (forceRefresh = false) => {
      const hit = _cache.get(key);
      const fresh = hit && Date.now() - hit.ts < ttl;

      if (!forceRefresh && fresh) {
        setState({ data: hit.data, loading: false, error: null });
        return;
      }

      if (hit) setState(s => ({ ...s, data: hit.data, loading: true }));

      try {
        const result = await fetcherRef.current();
        _cache.set(key, { data: result, ts: Date.now() });
        setState({ data: result, loading: false, error: null });
      } catch (err) {
        setState(s => ({ ...s, loading: false, error: err }));
      }
    },
    [key, ttl],
  );

  useEffect(() => {
    const hit = _cache.get(key);
    setState({ data: hit?.data ?? null, loading: !hit, error: null });
    load();
  }, [key, load]);

  return { ...state, refresh: () => load(true) };
}

export function invalidateCache(key) {
  _cache.delete(key);
}
