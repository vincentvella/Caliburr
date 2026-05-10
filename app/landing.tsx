import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Stack, Link } from 'expo-router';

const APP_STORE_URL = 'https://apps.apple.com/app/id6761644774';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=coffee.caliburr.app';

// Raw (un-framed) screenshots — the app is dark mode so these blend with the
// dark page; the cream-backdropped marketing frames in /marketing/iphone/ fight
// the page background.
const HERO_SHOT = require('../.maestro/screenshots/iphone/01_explore.png');
const GALLERY = [
  require('../.maestro/screenshots/iphone/02_explore_filter.png'),
  require('../.maestro/screenshots/iphone/03_recipe_detail.png'),
  require('../.maestro/screenshots/iphone/04_tries.png'),
  require('../.maestro/screenshots/iphone/06_grinder_stats.png'),
  require('../.maestro/screenshots/iphone/07_gear.png'),
];

const VALUE_PROPS = [
  {
    title: 'Recipes for your gear',
    body: 'Every recipe is tied to a specific grinder, machine, and bean. Search yours; see what other people actually dialed in.',
  },
  {
    title: 'Verified by the community',
    body: 'Grinders and machines are added once, then verified by other owners. No more guessing whether a setting maps to your burrs.',
  },
  {
    title: 'Tried this?',
    body: 'One tap to share whether a recipe worked. The more people chime in, the faster the next person dials in.',
  },
];

export default function LandingScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <>
      <Stack.Screen options={{ title: 'Caliburr — Dial in your perfect cup.' }} />
      <ScrollView className="flex-1 bg-ristretto-950">
        <View className="w-full max-w-6xl self-center flex-row items-center justify-between px-6 py-5">
          <Text className="text-harvest-500 text-2xl font-display-bold">Caliburr</Text>
          <View className="flex-row gap-3 items-center">
            <Link href="/(auth)/sign-in" asChild>
              <Pressable className="px-3 py-2">
                <Text className="text-latte-300 text-sm font-semibold">Sign in</Text>
              </Pressable>
            </Link>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable className="bg-harvest-500 px-4 py-2 rounded-lg">
                <Text className="text-white text-sm font-semibold">Get started</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View
          className={`w-full max-w-6xl self-center px-6 pt-12 pb-16 ${
            isDesktop ? 'flex-row items-center gap-16' : ''
          }`}
        >
          <View className="flex-1">
            <Text className="text-latte-100 text-5xl font-display-bold leading-tight mb-5">
              Dial in your perfect cup.
            </Text>
            <Text className="text-latte-400 text-lg leading-8 mb-8">
              Crowdsourced espresso, pour-over, and AeroPress recipes — pinned to the exact
              grinder, machine, and beans you own.
            </Text>
            <View className="flex-row gap-3 mb-6 flex-wrap items-start">
              <Link href="/(auth)/sign-up" asChild>
                <Pressable className="bg-harvest-500 px-6 py-4 rounded-xl">
                  <Text className="text-white font-semibold text-base">Sign up free</Text>
                </Pressable>
              </Link>
              <Link href="/(auth)/sign-in" asChild>
                <Pressable className="border border-ristretto-700 px-6 py-4 rounded-xl">
                  <Text className="text-latte-200 font-semibold text-base">Sign in</Text>
                </Pressable>
              </Link>
            </View>
            <View className="flex-row gap-3 flex-wrap items-start">
              <StoreBadge platform="ios" url={APP_STORE_URL} />
              <StoreBadge platform="android" url={PLAY_STORE_URL} />
            </View>
          </View>
          {isDesktop && (
            <View className="flex-1 items-center">
              <View
                style={{
                  borderRadius: 36,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: '#271d14',
                  boxShadow: '0 24px 60px rgba(249, 124, 15, 0.18)',
                }}
              >
                <Image
                  source={HERO_SHOT}
                  resizeMode="contain"
                  style={{ width: 340, height: 736 }}
                  accessibilityLabel="Caliburr explore feed"
                />
              </View>
            </View>
          )}
        </View>

        <View className="w-full bg-ristretto-900 py-20">
          <View className="w-full max-w-6xl self-center px-6">
            <Text className="text-latte-100 text-3xl font-display-bold text-center mb-3">
              Built around your gear.
            </Text>
            <Text className="text-latte-500 text-base text-center mb-12 max-w-2xl self-center">
              Grind setting on a Niche Zero doesn&apos;t mean the same thing on a Comandante. So we
              don&apos;t pretend it does.
            </Text>
            <View className={`gap-6 ${isDesktop ? 'flex-row' : ''}`}>
              {VALUE_PROPS.map((p) => (
                <View
                  key={p.title}
                  className="flex-1 bg-ristretto-950 p-7 rounded-2xl border border-ristretto-800"
                >
                  <Text className="text-harvest-400 text-lg font-display-semibold mb-3">
                    {p.title}
                  </Text>
                  <Text className="text-latte-500 text-base leading-7">{p.body}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="w-full max-w-6xl self-center px-6 py-20">
          <Text className="text-latte-100 text-3xl font-display-bold text-center mb-12">
            See it in action.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingHorizontal: 16 }}
          >
            {GALLERY.map((src, i) => (
              <View
                key={i}
                style={{
                  borderRadius: 28,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: '#271d14',
                }}
              >
                <Image
                  source={src}
                  resizeMode="contain"
                  style={{ width: 280, height: 606 }}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <View className="w-full bg-ristretto-900 py-20">
          <View className="w-full max-w-3xl self-center px-6 items-center">
            <Text className="text-latte-100 text-3xl font-display-bold text-center mb-4">
              Free, ad-free, no upsell.
            </Text>
            <Text className="text-latte-500 text-base text-center leading-7 mb-8">
              Caliburr is built by one person who&apos;s wrecked enough shots to want a better way.
              Sign up, log a recipe, help the next person dial in.
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable className="bg-harvest-500 px-8 py-4 rounded-xl mb-6">
                <Text className="text-white font-semibold text-base">Sign up free</Text>
              </Pressable>
            </Link>
            <View className="flex-row gap-3 flex-wrap justify-center items-start">
              <StoreBadge platform="ios" url={APP_STORE_URL} />
              <StoreBadge platform="android" url={PLAY_STORE_URL} />
            </View>
          </View>
        </View>

        <View className="w-full max-w-6xl self-center px-6 py-10 border-t border-ristretto-800">
          <View className="flex-row flex-wrap justify-between items-center gap-4">
            <Text className="text-latte-700 text-sm">© 2026 Caliburr</Text>
            <View className="flex-row flex-wrap gap-5">
              <Link href="/privacy">
                <Text className="text-latte-500 text-sm">Privacy</Text>
              </Link>
              <Link href="/terms">
                <Text className="text-latte-500 text-sm">Terms</Text>
              </Link>
              <Link href="/support">
                <Text className="text-latte-500 text-sm">Support</Text>
              </Link>
              <Link href="/delete-account">
                <Text className="text-latte-500 text-sm">Delete account</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function StoreBadge({ platform, url }: { platform: 'ios' | 'android'; url: string }) {
  const label = platform === 'ios' ? 'App Store' : 'Google Play';
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      className="border border-ristretto-700 bg-ristretto-900 px-4 py-2.5 rounded-lg flex-row items-center gap-3"
    >
      <View>
        <Text className="text-latte-500 text-[10px] uppercase tracking-wider">Download on</Text>
        <Text className="text-latte-100 text-sm font-semibold">{label}</Text>
      </View>
    </Pressable>
  );
}
