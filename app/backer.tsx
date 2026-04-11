import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as purchases from '@/lib/purchases';
import type { PurchasesPackage } from '@/lib/purchases';
import { PURCHASES_ERROR_CODE } from '@/lib/purchases';
import { BackerBadge } from '@/components/BackerBadge';
import { haptics } from '@/lib/haptics';
import { useBackerContext } from '@/lib/backerContext';

function useOffering() {
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOffering() {
      try {
        const offering = await purchases.getBackerOffering();
        setMonthly(offering?.monthly ?? null);
        setAnnual(offering?.annual ?? null);
      } catch {
        // Falls back to static prices shown in UI
      } finally {
        setLoading(false);
      }
    }
    loadOffering();
  }, []);

  return { monthly, annual, loading };
}

export default function BackerScreen() {
  const { monthly, annual, loading } = useOffering();
  const [selected, setSelected] = useState<'monthly' | 'annual'>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { isBacker, refresh } = useBackerContext();

  async function handlePurchase() {
    const pkg = selected === 'annual' ? annual : monthly;
    if (!pkg) {
      Alert.alert('Unavailable', 'Purchases are not available on this platform.');
      return;
    }
    setPurchasing(true);
    try {
      await purchases.purchasePackage(pkg);
      await refresh();
      haptics.success();
      Alert.alert(
        'Thank you! ☕',
        "You're now a Caliburr Backer. Your badge will appear on your brews.",
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      const isCancelled = code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
      if (!isCancelled) {
        haptics.error();
        const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
        Alert.alert('Purchase failed', msg);
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const restored = await purchases.restorePurchases();
      if (restored) await refresh();
      haptics.success();
      if (restored) {
        Alert.alert('Restored!', 'Your Backer status has been restored.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Nothing to restore', 'No active Backer subscription found.');
      }
    } catch {
      haptics.error();
      Alert.alert('Restore failed', 'Please try again.');
    } finally {
      setRestoring(false);
    }
  }

  const annualPrice = annual?.product.priceString ?? '$14.99';
  const monthlyPrice = monthly?.product.priceString ?? '$1.99';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1 bg-latte-50 dark:bg-ristretto-900"
        contentContainerClassName="px-6 pb-16"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pt-14 pb-4 mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-harvest-400 font-semibold">‹ Back</Text>
          </TouchableOpacity>
          <Text className="text-latte-950 dark:text-latte-100 font-semibold">Caliburr Backer</Text>
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
          {[
            { icon: '☕', title: 'Backer badge', desc: 'Shown on every brew you share' },
            {
              icon: '⚡',
              title: 'Beta features',
              desc: 'Early access to new features as they ship',
            },
            { icon: '🎧', title: 'Priority support', desc: 'Your messages are reviewed first' },
          ].map((perk) => (
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
          <>
            {/* Plan selection */}
            {loading ? (
              <ActivityIndicator color="#ff9d37" className="my-6" />
            ) : (
              <View className="gap-3 mb-8">
                <TouchableOpacity
                  onPress={() => setSelected('annual')}
                  className={`rounded-2xl p-4 border-2 ${
                    selected === 'annual'
                      ? 'border-harvest-500 bg-harvest-500/10'
                      : 'border-latte-200 dark:border-ristretto-700 bg-oat-100 dark:bg-ristretto-800'
                  }`}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-latte-950 dark:text-latte-100 font-semibold">
                          Annual
                        </Text>
                        <View className="bg-harvest-500 rounded-full px-2 py-0.5">
                          <Text className="text-white text-xs font-semibold">Best value</Text>
                        </View>
                      </View>
                      <Text className="text-latte-600 dark:text-latte-500 text-sm">
                        Save 37% vs monthly
                      </Text>
                    </View>
                    <Text className="text-latte-950 dark:text-latte-100 font-bold text-lg">
                      {annualPrice}
                      <Text className="text-latte-600 dark:text-latte-500 text-sm font-normal">
                        {' '}
                        / yr
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelected('monthly')}
                  className={`rounded-2xl p-4 border-2 ${
                    selected === 'monthly'
                      ? 'border-harvest-500 bg-harvest-500/10'
                      : 'border-latte-200 dark:border-ristretto-700 bg-oat-100 dark:bg-ristretto-800'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-latte-950 dark:text-latte-100 font-semibold">
                      Monthly
                    </Text>
                    <Text className="text-latte-950 dark:text-latte-100 font-bold text-lg">
                      {monthlyPrice}
                      <Text className="text-latte-600 dark:text-latte-500 text-sm font-normal">
                        {' '}
                        / mo
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={purchasing || loading}
              className="bg-harvest-500 rounded-xl py-4 items-center mb-4"
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Support Caliburr</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              className="items-center py-3 mb-6"
            >
              {restoring ? (
                <ActivityIndicator color="#ff9d37" size="small" />
              ) : (
                <Text className="text-latte-500 dark:text-latte-600 text-sm">
                  Restore Purchases
                </Text>
              )}
            </TouchableOpacity>

            <Text className="text-latte-400 dark:text-latte-700 text-xs text-center leading-5">
              Subscriptions auto-renew unless cancelled at least 24 hours before the end of the
              current period. Manage or cancel in your App Store account settings.
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}
