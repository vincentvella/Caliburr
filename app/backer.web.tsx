import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackerBadge } from '@/components/BackerBadge';
import { useBackerContext } from '@/lib/backerContext';

const PERKS = [
  { icon: '☕', title: 'Backer badge', desc: 'Shown on every brew you share' },
  { icon: '⚡', title: 'Beta features', desc: 'Early access to new features as they ship' },
  { icon: '🎧', title: 'Priority support', desc: 'Your messages are reviewed first' },
];

export default function BackerScreenWeb() {
  const { isBacker } = useBackerContext();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1 bg-latte-50 dark:bg-ristretto-900">
        <View className="max-w-2xl self-center w-full px-6 pb-16">
          {/* Header */}
          <View className="flex-row items-center justify-between pt-8 pb-4 mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-harvest-400 font-semibold">‹ Back</Text>
            </TouchableOpacity>
            <Text className="text-latte-950 dark:text-latte-100 font-semibold">
              Caliburr Backer
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Hero */}
          <View className="items-center mb-10">
            <Text style={{ fontSize: 56 }}>☕</Text>
            <Text className="text-latte-950 dark:text-latte-100 text-2xl font-bold mt-4 text-center">
              Caliburr Backer
            </Text>
            <Text className="text-latte-600 dark:text-latte-500 text-base text-center mt-2 leading-6">
              Help keep the community grind database alive.
            </Text>
          </View>

          {/* Perks */}
          <View className="gap-2 mb-8">
            {PERKS.map((perk) => (
              <View
                key={perk.title}
                className="flex-row items-center gap-3 bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3"
              >
                <Text style={{ fontSize: 20 }}>{perk.icon}</Text>
                <View className="flex-1">
                  <Text className="text-latte-950 dark:text-latte-100 font-semibold text-sm">
                    {perk.title}
                  </Text>
                  <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5">
                    {perk.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Badge preview */}
          <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4 mb-8">
            <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3">
              Your brews will look like this
            </Text>
            <View className="bg-oat-200 dark:bg-ristretto-700 rounded-xl p-3 border border-crema-600 dark:border-crema-700">
              <Text className="text-latte-950 dark:text-latte-100 font-semibold mb-1">
                Ethiopia Yirgacheffe · Blue Bottle
              </Text>
              <Text className="text-latte-600 dark:text-latte-500 text-xs mb-3">
                Comandante C40 · Espresso
              </Text>
              <BackerBadge size="sm" />
            </View>
          </View>

          {/* Status / CTA */}
          {isBacker ? (
            <View className="bg-crema-900/20 border border-crema-700 rounded-2xl px-4 py-5 items-center mb-8">
              <Text style={{ fontSize: 32 }}>☕</Text>
              <Text className="text-crema-300 font-semibold text-base mt-3">
                You&apos;re a Caliburr Backer
              </Text>
              <Text className="text-crema-500 text-sm text-center mt-1">
                Thank you for your support!
              </Text>
            </View>
          ) : (
            <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-5 py-6 items-center gap-3">
              <Ionicons name="phone-portrait-outline" size={32} color="#ff9d37" />
              <Text className="text-latte-950 dark:text-latte-100 font-semibold text-base text-center">
                Subscribe on iOS
              </Text>
              <Text className="text-latte-600 dark:text-latte-500 text-sm text-center leading-5">
                Caliburr Backer subscriptions are managed through the iOS app. Download it on the
                App Store to become a Backer.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
