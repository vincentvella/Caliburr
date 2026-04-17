import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { BackerBadge } from '@/components/BackerBadge';
import { useBackerContext } from '@/lib/backerContext';
import * as purchases from '@/lib/purchases';
import type { PurchasesPackage } from '@/lib/purchases';

const PERKS = [
  { icon: '☕', title: 'Backer badge', desc: 'Shown on every brew you share' },
  { icon: '⚡', title: 'Beta features', desc: 'Early access to new features as they ship' },
  { icon: '🎧', title: 'Priority support', desc: 'Your messages are reviewed first' },
];

export default function BackerScreenWeb() {
  const { isBacker, refresh } = useBackerContext();
  const { success } = useLocalSearchParams<{ success?: string }>();

  const [selected, setSelected] = useState<'annual' | 'monthly'>('annual');
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    purchases.getBackerOffering().then((offering) => {
      setMonthly(offering?.monthly ?? null);
      setAnnual(offering?.annual ?? null);
    });
  }, []);

  // Refresh backer status when returning from Stripe with ?success=1
  useEffect(() => {
    if (success === '1') refresh();
  }, [success, refresh]);

  const annualPrice = annual?.product.priceString ?? '$14.99';
  const monthlyPrice = monthly?.product.priceString ?? '$1.99';

  async function handleSubscribe() {
    const pkg = selected === 'annual' ? annual : monthly;
    if (!pkg) return;
    setError(null);
    setPurchasing(true);
    try {
      await purchases.purchasePackage(pkg);
      // purchasePackage redirects to Stripe — execution stops here
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setPurchasing(false);
    }
  }

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
            <Text className="text-latte-950 dark:text-latte-100 text-2xl font-display-bold mt-4 text-center">
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
          {isBacker || success === '1' ? (
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
            <View className="gap-3 mb-8">
              {/* Plan selector */}
              <View className="flex-row gap-3">
                {/* Annual */}
                <TouchableOpacity
                  onPress={() => setSelected('annual')}
                  className={`flex-1 rounded-2xl border p-4 ${
                    selected === 'annual'
                      ? 'bg-harvest-500 border-harvest-400'
                      : 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text
                      className={`text-xs font-semibold ${selected === 'annual' ? 'text-white' : 'text-latte-950 dark:text-latte-100'}`}
                    >
                      Annual
                    </Text>
                    <View
                      className={`rounded-full px-2 py-0.5 ${selected === 'annual' ? 'bg-white/20' : 'bg-bloom-900 border border-bloom-700'}`}
                    >
                      <Text
                        className={`text-xs font-semibold ${selected === 'annual' ? 'text-white' : 'text-bloom-400'}`}
                      >
                        Save 37%
                      </Text>
                    </View>
                  </View>
                  <Text
                    className={`text-2xl font-display-bold ${selected === 'annual' ? 'text-white' : 'text-latte-950 dark:text-latte-100'}`}
                  >
                    {annualPrice}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${selected === 'annual' ? 'text-white/80' : 'text-latte-600 dark:text-latte-500'}`}
                  >
                    per year
                  </Text>
                </TouchableOpacity>

                {/* Monthly */}
                <TouchableOpacity
                  onPress={() => setSelected('monthly')}
                  className={`flex-1 rounded-2xl border p-4 ${
                    selected === 'monthly'
                      ? 'bg-harvest-500 border-harvest-400'
                      : 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold mb-1 ${selected === 'monthly' ? 'text-white' : 'text-latte-950 dark:text-latte-100'}`}
                  >
                    Monthly
                  </Text>
                  <Text
                    className={`text-2xl font-display-bold ${selected === 'monthly' ? 'text-white' : 'text-latte-950 dark:text-latte-100'}`}
                  >
                    {monthlyPrice}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${selected === 'monthly' ? 'text-white/80' : 'text-latte-600 dark:text-latte-500'}`}
                  >
                    per month
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Subscribe button */}
              <TouchableOpacity
                onPress={handleSubscribe}
                disabled={purchasing}
                className="bg-harvest-500 rounded-2xl items-center justify-center"
                style={{ height: 52 }}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">Become a Backer →</Text>
                )}
              </TouchableOpacity>

              {error && <Text className="text-red-500 text-xs text-center">{error}</Text>}

              <Text className="text-latte-500 dark:text-latte-600 text-xs text-center">
                Secure checkout via Stripe. Cancel any time.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
