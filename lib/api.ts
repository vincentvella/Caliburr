import type { PostgrestError, AuthError } from '@supabase/supabase-js';

type SupabaseResult<T> = {
  data: T | null;
  error: PostgrestError | AuthError | null;
};

/**
 * Unwrap a Supabase result, throwing an Error on failure or null data.
 * Use inside async functions that should propagate failures as exceptions
 * (e.g. inside useQuery fetchers or useMutation handlers).
 */
export function unwrap<T>({ data, error }: SupabaseResult<T>): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('Unexpected empty response');
  return data;
}

/**
 * Like unwrap(), but allows null data to pass through.
 * Use for queries where no result is a valid outcome (e.g. .maybeSingle()).
 */
export function unwrapMaybe<T>({ data, error }: SupabaseResult<T>): T | null {
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Unwrap a Supabase result for mutations where the data payload is not needed.
 * Throws if there's an error.
 */
export function unwrapVoid({ error }: Pick<SupabaseResult<unknown>, 'error'>): void {
  if (error) throw new Error(error.message);
}
