import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function useAdminGuard() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.user_metadata?.is_admin !== true) {
        router.replace('/(tabs)');
      }
      setChecked(true);
    });
  }, []);

  return { checked };
}

export default function AdminLayout() {
  const { checked } = useAdminGuard();

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
    </Stack>
  );
}
