/**
 * No-op haptics for web — expo-haptics is not available in browsers.
 */
export const haptics = {
  tick: () => {},
  medium: () => {},
  select: () => {},
  success: () => {},
  error: () => {},
};
