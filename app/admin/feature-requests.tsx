import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type FeatureStatus = 'open' | 'planned' | 'done';

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  upvotes: number;
  created_at: string;
}

const STATUS_STYLES: Record<FeatureStatus, { pill: string; text: string; label: string }> = {
  open: {
    pill: 'bg-latte-200 dark:bg-ristretto-700',
    text: 'text-latte-600 dark:text-latte-400',
    label: 'Open',
  },
  planned: {
    pill: 'bg-harvest-500/20 border border-harvest-500',
    text: 'text-harvest-500',
    label: 'Planned',
  },
  done: { pill: 'bg-bloom-500/20 border border-bloom-500', text: 'text-bloom-500', label: 'Done' },
};

const STATUS_ORDER: FeatureStatus[] = ['open', 'planned', 'done'];

function useFeatureRequests() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feature_requests')
      .select('id, title, description, status, upvotes, created_at')
      .order('upvotes', { ascending: false });
    setRequests((data ?? []) as FeatureRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function setStatus(id: string, status: FeatureStatus) {
    setActioningId(id);
    const { error } = await supabase.from('feature_requests').update({ status }).eq('id', id);
    if (error) {
      Alert.alert('Error', 'Failed to update status.');
    } else {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    }
    setActioningId(null);
  }

  function promptStatus(req: FeatureRequest) {
    Alert.alert('Update Status', req.title, [
      ...STATUS_ORDER.filter((s) => s !== req.status).map((s) => ({
        text: STATUS_STYLES[s].label,
        onPress: () => setStatus(req.id, s),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  return { requests, loading, actioningId, promptStatus };
}

export default function AdminFeatureRequestsScreen() {
  const { requests, loading, actioningId, promptStatus } = useFeatureRequests();
  const [filter, setFilter] = useState<FeatureStatus | 'all'>('open');

  const counts = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, requests.filter((r) => r.status === s).length]),
  ) as Record<FeatureStatus, number>;

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Feature Requests</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        className="border-b border-latte-200 dark:border-ristretto-700"
        contentContainerClassName="flex-row items-center gap-2 px-4 py-2"
      >
        {(['all', ...STATUS_ORDER] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full border ${
              filter === s
                ? 'bg-harvest-500 border-harvest-500'
                : 'border-latte-300 dark:border-ristretto-600'
            }`}
          >
            <Text
              className={`text-sm font-medium capitalize ${filter === s ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
            >
              {s === 'all'
                ? `All (${requests.length})`
                : `${STATUS_STYLES[s].label} (${counts[s]})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-latte-600 dark:text-latte-500 text-sm">No requests here.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-3">
          {filtered.map((req) => {
            const s = STATUS_STYLES[req.status];
            return (
              <View
                key={req.id}
                className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-start justify-between gap-3 mb-1">
                  <Text className="text-latte-950 dark:text-latte-100 font-semibold flex-1">
                    {req.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => promptStatus(req)}
                    disabled={actioningId === req.id}
                    className={`${s.pill} rounded-full px-2.5 py-1`}
                  >
                    {actioningId === req.id ? (
                      <ActivityIndicator color="#ff9d37" size="small" style={{ width: 40 }} />
                    ) : (
                      <Text className={`${s.text} text-xs font-medium`}>{s.label}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {req.description ? (
                  <Text className="text-latte-600 dark:text-latte-500 text-sm leading-5 mb-2">
                    {req.description}
                  </Text>
                ) : null}
                <Text className="text-latte-500 dark:text-latte-600 text-xs">
                  {req.upvotes} vote{req.upvotes !== 1 ? 's' : ''} ·{' '}
                  {new Date(req.created_at).toLocaleDateString()}
                </Text>
              </View>
            );
          })}
          <View className="h-12" />
        </ScrollView>
      )}
    </View>
  );
}
