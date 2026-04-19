import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

function useAdminGuard() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.app_metadata?.is_admin !== true) {
        router.replace('/(tabs)');
      }
      setChecked(true);
    });
  }, []);

  return { checked };
}

async function registerAdminPushToken() {
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } =
    existing === 'granted' ? { status: existing } : await Notifications.requestPermissionsAsync();

  if (status !== 'granted') return;

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  if (!token) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await db.from('admin_push_tokens').upsert(
    {
      user_id: user.id,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  );
}

function useRegisterPushToken(checked: boolean) {
  useEffect(() => {
    if (checked) {
      registerAdminPushToken();
    }
  }, [checked]);
}

export default function AdminLayout() {
  const { checked } = useAdminGuard();
  useRegisterPushToken(checked);

  if (!checked) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edits" />
      <Stack.Screen name="support" />
      <Stack.Screen name="feature-requests" />
      <Stack.Screen name="recipes" />
      <Stack.Screen name="equipment" />
      <Stack.Screen name="backers" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="users" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}
