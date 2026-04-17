import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { useState, useEffect } from 'react';

const APP_STORE_URL = 'https://apps.apple.com/app/id6761644774';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=coffee.caliburr.app';
const DISMISSED_KEY = 'app_store_banner_dismissed';

type Platform = 'ios' | 'android' | null;

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  // Safari on iOS handles the banner natively via the <meta> tag — skip the custom banner
  const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
  if (isIOS && !isIOSSafari) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return null;
}

function useAppBanner() {
  const [platform, setPlatform] = useState<Platform>(null);
  useEffect(() => {
    const detected = detectPlatform();
    if (detected && !localStorage.getItem(DISMISSED_KEY)) {
      setPlatform(detected);
    }
  }, []);
  return { platform, setPlatform };
}

export function PlayStoreBanner() {
  const { platform, setPlatform } = useAppBanner();

  if (!platform) return null;

  const url = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  const label = platform === 'ios' ? 'App Store' : 'Google Play';

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setPlatform(null);
  }

  return (
    <View className="flex-row items-center bg-ristretto-900 border-b border-ristretto-800 px-4 py-2 gap-3">
      <Text style={{ fontSize: 22 }}>☕</Text>
      <View className="flex-1">
        <Text className="text-latte-100 text-sm font-semibold">Caliburr</Text>
        <Text className="text-latte-500 text-xs">Get the app on {label}</Text>
      </View>
      <TouchableOpacity
        onPress={() => Linking.openURL(url)}
        className="bg-harvest-500 px-3 py-1.5 rounded-lg"
      >
        <Text className="text-white text-xs font-semibold">Get</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text className="text-latte-600 text-lg leading-none">×</Text>
      </TouchableOpacity>
    </View>
  );
}
