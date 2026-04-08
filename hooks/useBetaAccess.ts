import { useBackerContext } from '@/lib/backerContext';

/**
 * Returns whether the current user has an active Caliburr Backer subscription.
 * Reads from BackerContext — no network request, checked once at app root.
 */
export function useBetaAccess() {
  return useBackerContext();
}
