import "../global.css";
import "react-native-url-polyfill/auto";

import { useEffect, useState } from "react";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

function useAuthGate(session: Session | null, ready: boolean) {
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;

    const inAuth = segments[0] === "(auth)";

    if (!session && !inAuth) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuth) {
      router.replace("/(tabs)");
    }
  }, [session, ready, segments]);
}

async function handleDeepLink(url: string) {
  // Supabase PKCE flow sends a `code` param — exchange it for a session
  if (url.includes("code=")) {
    await supabase.auth.exchangeCodeForSession(url);
  }
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    // Handle URL when app is already open
    const linkSub = Linking.addEventListener("url", ({ url }) => {
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

  useAuthGate(session, ready);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
