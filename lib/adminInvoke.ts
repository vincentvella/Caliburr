import { supabase } from './supabase';

/**
 * Invoke a Supabase Edge Function with a guaranteed auth token.
 * `functions.invoke` auto-wiring is unreliable with custom storage adapters —
 * we explicitly fetch (and refresh if needed) the session token.
 */
export async function adminInvoke<T = unknown>(
  fn: string,
  body: object,
): Promise<{ data: T | null; error: Error | null }> {
  let {
    data: { session },
  } = await supabase.auth.getSession();

  // Token missing or expired — try a refresh before giving up
  if (!session?.access_token) {
    ({
      data: { session },
    } = await supabase.auth.refreshSession());
  }

  if (!session?.access_token) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase.functions.invoke<T>(fn, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  return { data, error };
}
