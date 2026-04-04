import { useLocalSearchParams } from 'expo-router';

/**
 * Returns true only in dev builds when the current route has `?screenshot=1`.
 * Use this to hide sensitive or test-specific UI during Maestro screenshot flows.
 * Always returns false in production builds.
 */
export function useScreenshotMode(): boolean {
  const { screenshot } = useLocalSearchParams();
  return __DEV__ && !!screenshot;
}
