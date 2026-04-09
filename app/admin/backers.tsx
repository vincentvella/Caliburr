import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type BackerTier = 'monthly' | 'annual';

interface Backer {
  userId: string;
  email: string;
  tier: BackerTier;
  backerSince: string | null;
}

async function invokeBackerAdmin<T>(body: object): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('admin-backer', {
    body,
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  return data as T;
}

export default function AdminBackersScreen() {
  const [backers, setBackers] = useState<Backer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantTier, setGrantTier] = useState<BackerTier>('annual');
  const [granting, setGranting] = useState(false);

  const fetchBackers = useCallback(async () => {
    setLoading(true);
    try {
      const { backers: data } = await invokeBackerAdmin<{ backers: Backer[] }>({ action: 'list' });
      setBackers(data);
    } catch {
      Alert.alert('Error', 'Failed to load backers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBackers(); }, [fetchBackers]);

  async function handleGrant() {
    const email = grantEmail.trim();
    if (!email) return;
    setGranting(true);
    try {
      await invokeBackerAdmin({ action: 'grant', email, tier: grantTier });
      setGrantEmail('');
      await fetchBackers();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Failed to grant backer status.';
      Alert.alert('Error', msg);
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(backer: Backer) {
    Alert.alert(
      'Revoke Backer',
      `Remove backer status from ${backer.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setActioningId(backer.userId);
            try {
              await invokeBackerAdmin({ action: 'revoke', userId: backer.userId });
              setBackers((prev) => prev.filter((b) => b.userId !== backer.userId));
            } catch {
              Alert.alert('Error', 'Failed to revoke backer status.');
            } finally {
              setActioningId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Backers</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Grant backer */}
        <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4 mb-6">
          <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Grant Backer Status
          </Text>
          <TextInput
            value={grantEmail}
            onChangeText={setGrantEmail}
            placeholder="user@example.com"
            placeholderTextColor="#9b7b60"
            autoCapitalize="none"
            keyboardType="email-address"
            className="bg-oat-200 dark:bg-ristretto-700 border border-latte-200 dark:border-ristretto-600 rounded-xl px-4 py-3 text-latte-950 dark:text-latte-100 text-sm mb-3"
            style={{ lineHeight: undefined }}
          />
          <View className="flex-row gap-2 mb-3">
            {(['annual', 'monthly'] as BackerTier[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setGrantTier(t)}
                className={`flex-1 py-2 rounded-xl border items-center ${
                  grantTier === t
                    ? 'bg-harvest-500 border-harvest-500'
                    : 'border-latte-300 dark:border-ristretto-600'
                }`}
              >
                <Text
                  className={`text-sm font-medium capitalize ${grantTier === t ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={handleGrant}
            disabled={granting || !grantEmail.trim()}
            className="bg-harvest-500 rounded-xl py-3 items-center"
            style={{ opacity: grantEmail.trim() ? 1 : 0.5 }}
          >
            {granting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold text-sm">Grant</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Current backers */}
        <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
          Active Backers · {backers.length}
        </Text>

        {loading ? (
          <ActivityIndicator color="#ff9d37" style={{ marginTop: 16 }} />
        ) : backers.length === 0 ? (
          <Text className="text-latte-600 dark:text-latte-500 text-sm text-center mt-4">
            No active backers yet.
          </Text>
        ) : (
          backers.map((backer) => (
            <View
              key={backer.userId}
              className="flex-row items-center bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5 mb-3"
            >
              <View className="flex-1">
                <Text className="text-latte-950 dark:text-latte-100 font-medium" numberOfLines={1}>
                  {backer.email}
                </Text>
                <Text className="text-latte-500 dark:text-latte-600 text-xs mt-0.5 capitalize">
                  {backer.tier}
                  {backer.backerSince
                    ? ` · since ${new Date(backer.backerSince).toLocaleDateString()}`
                    : ''}
                </Text>
              </View>
              {actioningId === backer.userId ? (
                <ActivityIndicator color="#ff9d37" size="small" />
              ) : (
                <TouchableOpacity
                  onPress={() => handleRevoke(backer)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text className="text-red-400 text-sm font-medium">Revoke</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
        <View className="h-12" />
      </ScrollView>
    </View>
  );
}
