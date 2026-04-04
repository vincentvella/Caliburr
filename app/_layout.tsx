import '../global.css';
import 'react-native-url-polyfill/auto';

import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function useAuthGate(session: Session | null, ready: boolean, isRecovery: boolean) {
  const segments = useSegments();

  useEffect(() => {
    if (!ready || isRecovery) return;

    const inAuth = segments[0] === '(auth)';
    const inPublic = segments[0] === 'privacy' || segments[0] === 'support'; // public web-only routes, no auth required

    if (!session && !inAuth && !inPublic) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuth) {
      const onboardingDone = session.user.user_metadata?.onboarding_completed;
      router.replace(onboardingDone ? '/(tabs)' : '/onboarding');
    }
  }, [session, ready, segments, isRecovery]);
}

async function handleDeepLink(url: string) {
  // Supabase PKCE flow sends a `code` param — exchange it for a session
  if (url.includes('code=')) {
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) {
      console.warn('Failed to exchange auth code:', error.message);
    }
  }
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        router.replace('/(auth)/reset-password');
      } else if (event === 'USER_UPDATED') {
        setIsRecovery(false);
      }
    });

    // Handle URL when app is already open
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle URL that launched the app from cold start
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  useAuthGate(session, ready, isRecovery);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="support" />
        <Stack.Screen name="account/index" />
        <Stack.Screen name="account/change-password" />
        <Stack.Screen name="recipe/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ErrorBoundary>
  );
}
