"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseBackendResult<T> {
  data: T;
  loading: boolean;
  live: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch live backend data with a dummy-data fallback.
 * - `fallback` is shown immediately (pages never render empty).
 * - When `token` is present the loader runs; on success `live` flips true.
 * - On failure the fallback stays and `live` stays false ("cached" badge).
 */
export function useBackend<T>(
  fallback: T,
  loader: (token: string) => Promise<T>,
  token: string | null
): UseBackendResult<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loaderRef
      .current(token)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLive(true);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { data, loading, live, error, refresh };
}
