import '../global.css';
import 'react-native-url-polyfill/auto';

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { useUniwind } from 'uniwind';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_400Regular_Italic,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/lib/theme';
import { BackerProvider } from '@/lib/backerContext';
import * as purchases from '@/lib/purchases';

SplashScreen.preventAutoHideAsync();

// Lock phones to portrait; let iPads rotate freely
if (Platform.OS === 'ios' && !Platform.isPad) {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}

function useHideSplash(fontsLoaded: boolean, authReady: boolean) {
  useEffect(() => {
    if (fontsLoaded && authReady) SplashScreen.hideAsync();
  }, [fontsLoaded, authReady]);
}

function useSetupAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    purchases.configure();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
      if (session?.user.id) purchases.logIn(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user.id) {
        purchases.logIn(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        purchases.logOut();
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        router.replace('/(auth)/reset-password');
      } else if (event === 'USER_UPDATED') {
        setIsRecovery(false);
      }
    });

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  return { session, ready, isRecovery };
}

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
  const { session, ready, isRecovery } = useSetupAuth();
  const { theme } = useUniwind();

  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_400Regular_Italic,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useHideSplash(fontsLoaded, ready);
  useAuthGate(session, ready, isRecovery);

  if (!fontsLoaded || !ready) return null;

  return (
    <ThemeProvider>
      <BackerProvider>
        <ErrorBoundary>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="support" />
            <Stack.Screen name="account/index" />
            <Stack.Screen name="account/change-password" />
            <Stack.Screen name="feature-requests" />
            <Stack.Screen name="backer" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="recipe/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="user/[id]" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ErrorBoundary>
      </BackerProvider>
    </ThemeProvider>
  );
}
