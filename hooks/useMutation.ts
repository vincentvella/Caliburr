import { useState, useRef } from 'react';

/**
 * Generic async mutation hook. Tracks submitting/error state for any async
 * operation (deletes, toggles, non-form writes, etc.).
 *
 * - mutate()      — runs the mutator, captures errors into state, never throws
 * - mutateAsync() — same, but re-throws so the caller can react (e.g. revert
 *                   an optimistic update)
 * - clearError()  — reset error state (e.g. when the user edits a field)
 *
 * Throw inside the mutator to signal failure — use the unwrap() helpers in
 * lib/api.ts to convert Supabase { data, error } responses into throws.
 */
export function useMutation<TArgs extends unknown[], TResult = void>(
  mutator: (...args: TArgs) => Promise<TResult>,
) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutatorRef = useRef(mutator);
  mutatorRef.current = mutator;

  async function mutateAsync(...args: TArgs): Promise<TResult> {
    setSubmitting(true);
    setError(null);
    try {
      return await mutatorRef.current(...args);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong';
      setError(message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }

  async function mutate(...args: TArgs): Promise<TResult | undefined> {
    try {
      return await mutateAsync(...args);
    } catch {
      return undefined;
    }
  }

  function clearError() {
    setError(null);
  }

  return { mutate, mutateAsync, submitting, error, clearError };
}
