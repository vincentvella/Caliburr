import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface SupportRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'open' | 'resolved';
  is_backer: boolean;
  created_at: string;
}

function useSupportRequests() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_requests')
      .select('id, name, email, message, status, is_backer, created_at')
      .order('created_at', { ascending: false });
    setRequests((data ?? []) as SupportRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function resolve(id: string) {
    setActioningId(id);
    const { error } = await supabase
      .from('support_requests')
      .update({ status: 'resolved' })
      .eq('id', id);
    if (error) {
      Alert.alert('Error', 'Failed to update request.');
    } else {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r)));
    }
    setActioningId(null);
  }

  return { requests, loading, actioningId, resolve };
}

export default function SupportScreen() {
  const { requests, loading, actioningId, resolve } = useSupportRequests();
  const [filter, setFilter] = useState<'open' | 'resolved'>('open');

  const filtered = requests.filter((r) => r.status === filter);

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Support</Text>
        <View style={{ width: 64 }} />
      </View>

      <View className="flex-row mx-4 mt-3 mb-1 bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl p-1">
        {(['open', 'resolved'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setFilter(s)}
            className={`flex-1 py-2 rounded-lg items-center ${filter === s ? 'bg-harvest-500' : ''}`}
          >
            <Text
              className={`text-sm font-medium capitalize ${filter === s ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
            >
              {s}{' '}
              <Text className="font-normal">({requests.filter((r) => r.status === s).length})</Text>
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
          <Text className="text-latte-600 dark:text-latte-500 text-sm">No {filter} requests.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-3">
          {filtered.map((req) => (
            <View
              key={req.id}
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-start justify-between mb-1">
                <View className="flex-row items-center gap-2 flex-1">
                  <Text className="text-latte-950 dark:text-latte-100 font-semibold">
                    {req.name}
                  </Text>
                  {req.is_backer && (
                    <View className="bg-crema-900/30 border border-crema-700 rounded-full px-2 py-0.5">
                      <Text className="text-crema-400 text-xs">Backer</Text>
                    </View>
                  )}
                </View>
                <Text className="text-latte-500 dark:text-latte-600 text-xs">
                  {new Date(req.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text className="text-harvest-400 text-xs mb-3">{req.email}</Text>
              <Text className="text-latte-700 dark:text-latte-300 text-sm leading-5">
                {req.message}
              </Text>
              {req.status === 'open' && (
                <TouchableOpacity
                  onPress={() => resolve(req.id)}
                  disabled={actioningId === req.id}
                  className="mt-3 border border-latte-300 dark:border-ristretto-600 rounded-xl py-2.5 items-center"
                >
                  {actioningId === req.id ? (
                    <ActivityIndicator color="#ff9d37" size="small" />
                  ) : (
                    <Text className="text-latte-600 dark:text-latte-400 text-sm font-medium">
                      Mark Resolved
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
          <View className="h-12" />
        </ScrollView>
      )}
    </View>
  );
}
