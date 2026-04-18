import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { adminInvoke } from '@/lib/adminInvoke';

type FilterType = 'all' | 'unverified' | 'verified';

interface AdminGrinder {
  id: string;
  brand: string;
  model: string;
  burr_type: string | null;
  adjustment_type: string | null;
  verified: boolean;
  grinder_verifications: { user_id: string }[];
}

interface AdminMachine {
  id: string;
  brand: string;
  model: string;
  machine_type: string;
  verified: boolean;
  machine_verifications: { user_id: string }[];
}

type EquipmentItem =
  | { kind: 'grinder'; data: AdminGrinder }
  | { kind: 'machine'; data: AdminMachine };

function useEquipment() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const [gRes, mRes] = await Promise.all([
      supabase
        .from('grinders')
        .select(
          'id, brand, model, burr_type, adjustment_type, verified, grinder_verifications(user_id)',
        )
        .order('verified', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('brew_machines')
        .select('id, brand, model, machine_type, verified, machine_verifications(user_id)')
        .order('verified', { ascending: true })
        .order('created_at', { ascending: false }),
    ]);

    const grinders: EquipmentItem[] = ((gRes.data ?? []) as AdminGrinder[]).map((g) => ({
      kind: 'grinder',
      data: g,
    }));
    const machines: EquipmentItem[] = ((mRes.data ?? []) as AdminMachine[]).map((m) => ({
      kind: 'machine',
      data: m,
    }));
    setItems([...grinders, ...machines]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, setItems, loading };
}

export default function AdminEquipmentScreen() {
  const { items, setItems, loading } = useEquipment();
  const [filter, setFilter] = useState<FilterType>('unverified');
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function handleVerify(item: EquipmentItem, action: 'verify' | 'unverify') {
    const id = item.data.id;
    const equipmentType = item.kind === 'grinder' ? 'grinder' : 'machine';
    const label = `${item.data.brand} ${item.data.model}`;

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        action === 'verify' ? 'Verify Equipment' : 'Un-verify Equipment',
        action === 'verify'
          ? `Mark ${label} as verified? This bypasses the 5-vote threshold.`
          : `Un-verify ${label}? All existing verifications will be cleared and the community count will reset.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: action === 'verify' ? 'Verify' : 'Un-verify', onPress: () => resolve(true) },
        ],
      );
    });

    if (!confirmed) return;

    setActioningId(id);

    const { error, data } = await adminInvoke<{ error?: string }>('admin-verify-equipment', {
      equipmentId: id,
      equipmentType,
      action,
    });

    if (error || data?.error) {
      const msg = data?.error ?? error?.message ?? 'Unknown error';
      Alert.alert('Error', msg);
    } else {
      setItems((prev) =>
        prev.map((i) => {
          if (i.data.id !== id) return i;
          if (i.kind === 'grinder') {
            return {
              ...i,
              data: {
                ...i.data,
                verified: action === 'verify',
                grinder_verifications: action === 'unverify' ? [] : i.data.grinder_verifications,
              },
            };
          }
          return {
            ...i,
            data: {
              ...i.data,
              verified: action === 'verify',
              machine_verifications:
                action === 'unverify' ? [] : (i.data as AdminMachine).machine_verifications,
            },
          };
        }),
      );
    }
    setActioningId(null);
  }

  const counts = {
    all: items.length,
    unverified: items.filter((i) => !i.data.verified).length,
    verified: items.filter((i) => i.data.verified).length,
  };

  const filtered =
    filter === 'all'
      ? items
      : items.filter((i) => (filter === 'verified' ? i.data.verified : !i.data.verified));

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Equipment</Text>
        <View style={{ width: 64 }} />
      </View>

      <View className="flex-row items-center gap-2 px-4 py-2 border-b border-latte-200 dark:border-ristretto-700">
        {(['unverified', 'verified', 'all'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full border ${
              filter === f
                ? 'bg-harvest-500 border-harvest-500'
                : 'border-latte-300 dark:border-ristretto-600'
            }`}
          >
            <Text
              className={`text-sm font-medium capitalize ${filter === f ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
            >
              {f === 'all'
                ? `All (${counts.all})`
                : f === 'unverified'
                  ? `Unverified (${counts.unverified})`
                  : `Verified (${counts.verified})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-latte-600 dark:text-latte-500 text-sm">Nothing here.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-3">
          {filtered.map((item) => {
            const voteCount =
              item.kind === 'grinder'
                ? item.data.grinder_verifications.length
                : (item.data as AdminMachine).machine_verifications.length;
            const subtitle =
              item.kind === 'grinder'
                ? [item.data.burr_type, item.data.adjustment_type].filter(Boolean).join(' · ')
                : item.data.machine_type;

            return (
              <View
                key={item.data.id}
                className="flex-row items-center bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5 mb-3"
              >
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-latte-950 dark:text-latte-100 font-medium">
                      {item.data.brand} {item.data.model}
                    </Text>
                    {item.data.verified && (
                      <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-full px-2 py-0.5">
                        <Text className="text-bloom-700 dark:text-bloom-400 text-xs">Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-latte-500 dark:text-latte-600 text-xs mt-0.5 capitalize">
                    {item.kind} · {subtitle || '—'} · {voteCount}/5 votes
                  </Text>
                </View>

                {actioningId === item.data.id ? (
                  <ActivityIndicator color="#ff9d37" size="small" />
                ) : item.data.verified ? (
                  <TouchableOpacity
                    onPress={() => handleVerify(item, 'unverify')}
                    className="border border-latte-300 dark:border-ristretto-600 rounded-lg px-3 py-1.5"
                  >
                    <Text className="text-latte-600 dark:text-latte-400 text-sm">Un-verify</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleVerify(item, 'verify')}
                    className="bg-bloom-600 rounded-lg px-3 py-1.5"
                  >
                    <Text className="text-white text-sm font-medium">Verify</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          <View className="h-12" />
        </ScrollView>
      )}
    </View>
  );
}
