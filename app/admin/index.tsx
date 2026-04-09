import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface AdminCounts {
  edits: number;
  unverified: number;
  support: number;
  featureRequests: number;
}

function useAdminCounts() {
  const [counts, setCounts] = useState<AdminCounts | null>(null);

  useEffect(() => {
    async function fetch() {
      const [gRes, mRes, giRes, miRes, ugRes, umRes, sRes, fRes] = await Promise.all([
        supabase.from('grinder_edits').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('machine_edits').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('grinders') as any).select('*', { count: 'exact', head: true }).eq('image_status', 'pending'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('brew_machines') as any).select('*', { count: 'exact', head: true }).eq('image_status', 'pending'),
        supabase.from('grinders').select('*', { count: 'exact', head: true }).eq('verified', false),
        supabase.from('brew_machines').select('*', { count: 'exact', head: true }).eq('verified', false),
        supabase.from('support_requests').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('feature_requests').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      setCounts({
        edits: (gRes.count ?? 0) + (mRes.count ?? 0) + (giRes.count ?? 0) + (miRes.count ?? 0),
        unverified: (ugRes.count ?? 0) + (umRes.count ?? 0),
        support: sRes.count ?? 0,
        featureRequests: fRes.count ?? 0,
      });
    }
    fetch();
  }, []);

  return counts;
}

interface NavRowProps {
  label: string;
  count: number | null;
  onPress: () => void;
}

function NavRow({ label, count, onPress }: NavRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-4 mb-3"
    >
      <Text className="text-latte-950 dark:text-latte-100 font-medium">{label}</Text>
      <View className="flex-row items-center gap-2">
        {count === null ? (
          <ActivityIndicator color="#ff9d37" size="small" />
        ) : count > 0 ? (
          <View className="bg-harvest-500 rounded-full min-w-6 h-6 px-1.5 items-center justify-center">
            <Text className="text-white text-xs font-semibold">{count}</Text>
          </View>
        ) : null}
        <Text className="text-latte-500 dark:text-latte-600 text-lg">›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminScreen() {
  const counts = useAdminCounts();

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Admin</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <NavRow
          label="Recipes"
          count={0}
          onPress={() => router.push('/admin/recipes')}
        />
        <NavRow
          label="Equipment Edits"
          count={counts?.edits ?? null}
          onPress={() => router.push('/admin/edits')}
        />
        <NavRow
          label="Equipment Verification"
          count={counts?.unverified ?? null}
          onPress={() => router.push('/admin/equipment')}
        />
        <NavRow
          label="Stats"
          count={0}
          onPress={() => router.push('/admin/stats')}
        />
        <NavRow
          label="Backers"
          count={0}
          onPress={() => router.push('/admin/backers')}
        />
        <NavRow
          label="Support Requests"
          count={counts?.support ?? null}
          onPress={() => router.push('/admin/support')}
        />
        <NavRow
          label="Feature Requests"
          count={counts?.featureRequests ?? null}
          onPress={() => router.push('/admin/feature-requests')}
        />
      </ScrollView>
    </View>
  );
}
