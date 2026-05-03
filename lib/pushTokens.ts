import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { supabase } from './supabase';
import { db } from './db';

/**
 * Request notification permission, fetch the device's Expo push token, and
 * upsert it into push_tokens for the current user.
 *
 * No-op on web (we don't push the web client). Silent failure if the user
 * declines permission — they can re-prompt later via system settings or by
 * acting in-app again.
 */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const status =
      existing === 'granted'
        ? existing
        : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (!token) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await db.from('push_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );
  } catch (e) {
    // Android without FCM credentials throws "Default FirebaseApp is not
    // initialized" — expected until the firebase setup ships in a build,
    // not worth Sentry-reporting on every launch.
    const message = (e as Error)?.message ?? '';
    if (
      Platform.OS === 'android' &&
      message.includes('FirebaseApp is not initialized')
    ) {
      return;
    }
    Sentry.captureException(e, { tags: { feature: 'push-tokens', stage: 'register' } });
  }
}
