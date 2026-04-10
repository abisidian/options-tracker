"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePollingResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  fetchedAt: number | null;
  refetch: () => void;
}

/**
 * Poll an async fetcher on a fixed interval. Pauses when the document is
 * hidden and resumes on visibility change. Cancels in-flight requests on
 * unmount or when deps change.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  deps: React.DependencyList = [],
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      const result = await fetcherRef.current();
      if (ctl.signal.aborted) return;
      setData(result);
      setError(null);
      setFetchedAt(Date.now());
    } catch (err) {
      if (ctl.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    run();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        run();
      }
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, fetchedAt, refetch: run };
}
