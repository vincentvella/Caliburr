import { useState, useEffect, useRef, type DependencyList } from 'react';

/**
 * Generic data-fetching hook. Manages loading/error state and re-runs the
 * fetcher whenever deps change. The fetcher is held in a ref so it is always
 * up-to-date without needing to be listed in deps.
 *
 * Throw inside the fetcher to signal an error — use the unwrap() helpers in
 * lib/api.ts to convert Supabase { data, error } responses into throws.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcherRef.current();
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
