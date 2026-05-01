import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUniwind } from 'uniwind';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';

const REDIRECT_TO =
  typeof window !== 'undefined' ? `${window.location.origin}/(auth)/sign-in` : undefined;

export function SocialSignIn({ onError }: { onError?: (msg: string) => void }) {
  const { theme } = useUniwind();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  function reportError(stage: string, err: unknown, msg: string) {
    Sentry.captureException(err, { tags: { feature: 'social-auth', stage } });
    if (onError) onError(msg);
    else Alert.alert('Sign-in failed', msg);
  }

  async function handle(provider: 'apple' | 'google') {
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: REDIRECT_TO },
    });
    if (error) {
      reportError(`${provider}-oauth`, error, error.message);
      setBusy(null);
    }
    // On success the browser navigates away; no need to clear busy.
  }

  const iconColor = theme === 'dark' ? '#f6efe7' : '#1c1917';
  const isBusy = busy !== null;

  return (
    <View className="gap-3 mb-4">
      <View className="flex-row items-center gap-3 my-2">
        <View className="flex-1 h-px bg-latte-200 dark:bg-ristretto-700" />
        <Text className="text-latte-500 dark:text-latte-600 text-xs uppercase tracking-wide">
          or
        </Text>
        <View className="flex-1 h-px bg-latte-200 dark:bg-ristretto-700" />
      </View>

      <TouchableOpacity
        onPress={() => handle('apple')}
        disabled={isBusy}
        className="bg-latte-950 dark:bg-latte-100 rounded-xl py-4 flex-row items-center justify-center gap-2"
        style={{ opacity: isBusy ? 0.6 : 1 }}
      >
        {busy === 'apple' ? (
          <ActivityIndicator color={theme === 'dark' ? '#1c1917' : '#f6efe7'} />
        ) : (
          <>
            <Ionicons
              name="logo-apple"
              size={18}
              color={theme === 'dark' ? '#1c1917' : '#f6efe7'}
            />
            <Text className="text-latte-50 dark:text-ristretto-900 font-semibold text-base">
              Continue with Apple
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handle('google')}
        disabled={isBusy}
        className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl py-4 flex-row items-center justify-center gap-2"
        style={{ opacity: isBusy ? 0.6 : 1 }}
      >
        {busy === 'google' ? (
          <ActivityIndicator color={iconColor} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={iconColor} />
            <Text className="text-latte-950 dark:text-latte-100 font-semibold text-base">
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
