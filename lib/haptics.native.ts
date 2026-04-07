import * as Haptics from 'expo-haptics';

/**
 * Thin wrappers around expo-haptics.
 */
export const haptics = {
  /** Subtle click — grind tape steps, individual selections */
  tick: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** Mid-weight — upvotes, toggle default, timer stop */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** Selection changed — item picked from a list */
  select: () => Haptics.selectionAsync(),
  /** Completion — save, submit, equipment added */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  /** Failure — shown alongside an error message */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
