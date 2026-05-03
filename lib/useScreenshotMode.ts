import { useEffect } from 'react';
import { useGlobalSearchParams } from 'expo-router';

// Sticky module-level flag — once any route gets `?screenshot=1`, it stays
// on for the rest of the session. Each Maestro flow re-launches the app
// (cold start), so the stickiness only ever applies within one capture.
let stickyEnabled = false;

/**
 * Returns true only in dev builds when the current URL — or any prior
 * URL in this session — has `?screenshot=1`. Use this to hide sensitive
 * or test-specific UI during Maestro screenshot flows, or to inject
 * believable fake data for marketing screenshots.
 *
 * Always returns false in production builds.
 *
 * Uses useGlobalSearchParams so the param is detected regardless of which
 * route in the stack the hook is called from.
 */
export function useScreenshotMode(): boolean {
  const { screenshot } = useGlobalSearchParams();
  useEffect(() => {
    if (__DEV__ && screenshot) stickyEnabled = true;
  }, [screenshot]);
  return __DEV__ && (stickyEnabled || !!screenshot);
}
