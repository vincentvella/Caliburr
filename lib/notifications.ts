import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// When a notification arrives while the app is foregrounded, show it instead
// of swallowing it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationData {
  kind?: string;
  recipe_id?: string;
}

function routeForData(data: NotificationData | null | undefined) {
  if (!data) return;
  if (data.kind === 'recipe-tried' && typeof data.recipe_id === 'string') {
    router.push(`/recipe/${data.recipe_id}`);
  }
}

/**
 * Handles taps on push notifications:
 *   - Listens for taps while the app is alive
 *   - On launch, checks if the app was opened from a notification
 *
 * Should be called once the auth gate has settled (so the route stack exists).
 */
export function useNotificationDeepLink(authReady: boolean) {
  useEffect(() => {
    if (!authReady || Platform.OS === 'web') return;

    let cancelled = false;

    // App was launched from a tapped notification (cold start).
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled) return;
      const data = response?.notification.request.content.data as NotificationData | undefined;
      routeForData(data);
    });

    // App is alive and the user tapped a notification.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData | undefined;
      routeForData(data);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [authReady]);
}
