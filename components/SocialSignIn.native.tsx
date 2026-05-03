import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';
import { useUniwind } from 'uniwind';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let googleConfigured = false;
function configureGoogle() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: Platform.OS === 'ios' ? IOS_CLIENT_ID : undefined,
  });
  googleConfigured = true;
}

export function SocialSignIn({ onError }: { onError?: (msg: string) => void }) {
  const { theme } = useUniwind();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
    configureGoogle();
  }, []);

  function reportError(stage: string, err: unknown, msg: string) {
    Sentry.captureException(err, { tags: { feature: 'social-auth', stage } });
    if (onError) onError(msg);
    else Alert.alert('Sign-in failed', msg);
  }

  async function handleApple() {
    setAppleBusy(true);
    try {
      // Apple identity tokens always carry a nonce. Generate a raw nonce, hash
      // it for Apple, and pass the raw value to Supabase so it can verify the
      // token's nonce claim (sha256(raw) === token.nonce).
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        reportError('apple-no-token', new Error('No identityToken'), 'Apple returned no token.');
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) reportError('apple-supabase', error, error.message);
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }
      reportError('apple-unhandled', e, 'Could not sign in with Apple.');
    } finally {
      setAppleBusy(false);
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      // v16 returns `{ type: 'cancelled' }` on dismiss instead of throwing —
      // bail silently so we don't false-positive Sentry as "no idToken".
      if (result.type === 'cancelled') return;
      const idToken = result.data?.idToken;
      if (!idToken) {
        reportError('google-no-token', new Error('No idToken'), 'Google returned no token.');
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) reportError('google-supabase', error, error.message);
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return;
      reportError('google-unhandled', e, 'Could not sign in with Google.');
    } finally {
      setGoogleBusy(false);
    }
  }

  const googleIconColor = theme === 'dark' ? '#f6efe7' : '#1c1917';
  const busy = googleBusy || appleBusy;

  return (
    <View className="gap-3 mb-4">
      <View className="flex-row items-center gap-3 my-2">
        <View className="flex-1 h-px bg-latte-200 dark:bg-ristretto-700" />
        <Text className="text-latte-500 dark:text-latte-600 text-xs uppercase tracking-wide">
          or
        </Text>
        <View className="flex-1 h-px bg-latte-200 dark:bg-ristretto-700" />
      </View>

      {Platform.OS === 'ios' && appleAvailable && (
        <View pointerEvents={busy ? 'none' : 'auto'}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              theme === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={{ height: 52, opacity: appleBusy ? 0.6 : 1 }}
            onPress={handleApple}
          />
        </View>
      )}

      <TouchableOpacity
        onPress={handleGoogle}
        disabled={busy}
        className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl py-4 flex-row items-center justify-center gap-2"
        style={{ opacity: busy ? 0.6 : 1 }}
      >
        {googleBusy ? (
          <ActivityIndicator color={googleIconColor} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={googleIconColor} />
            <Text className="text-latte-950 dark:text-latte-100 font-semibold text-base">
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
