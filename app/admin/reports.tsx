import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

type ReportStatus = 'open' | 'resolved' | 'dismissed';

interface Report {
  id: string;
  reporter_id: string | null;
  target_type: 'recipe' | 'grinder' | 'machine';
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  targetLabel?: string;
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  incorrect: 'Incorrect data',
  inappropriate: 'Inappropriate',
  duplicate: 'Duplicate',
  other: 'Other',
};

async function fetchReports(status: ReportStatus): Promise<Report[]> {
  const { data } = await db
    .from('reports')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  const reports = (data ?? []) as Report[];
  if (!reports.length) return [];

  // Fetch target labels in parallel
  const recipeIds = reports.filter((r) => r.target_type === 'recipe').map((r) => r.target_id);
  const grinderIds = reports.filter((r) => r.target_type === 'grinder').map((r) => r.target_id);
  const machineIds = reports.filter((r) => r.target_type === 'machine').map((r) => r.target_id);

  const [recipesRes, grindersRes, machinesRes] = await Promise.all([
    recipeIds.length
      ? supabase
          .from('recipes')
          .select('id, brew_method, grinder:grinders(brand, model)')
          .in('id', recipeIds)
      : { data: [] },
    grinderIds.length
      ? supabase.from('grinders').select('id, brand, model').in('id', grinderIds)
      : { data: [] },
    machineIds.length
      ? supabase.from('brew_machines').select('id, brand, model').in('id', machineIds)
      : { data: [] },
  ]);

  const labelMap: Record<string, string> = {};
  for (const r of (recipesRes.data ?? []) as {
    id: string;
    brew_method: string;
    grinder: { brand: string; model: string } | null;
  }[]) {
    labelMap[r.id] = r.grinder
      ? `${r.grinder.brand} ${r.grinder.model} · ${r.brew_method.replace(/_/g, ' ')}`
      : r.brew_method;
  }
  for (const g of (grindersRes.data ?? []) as { id: string; brand: string; model: string }[]) {
    labelMap[g.id] = `${g.brand} ${g.model}`;
  }
  for (const m of (machinesRes.data ?? []) as { id: string; brand: string; model: string }[]) {
    labelMap[m.id] = `${m.brand} ${m.model}`;
  }

  return reports.map((r) => ({ ...r, targetLabel: labelMap[r.target_id] ?? r.target_id }));
}

function useAdminReports(filter: ReportStatus) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async (status: ReportStatus) => {
    setLoading(true);
    const data = await fetchReports(status);
    setReports(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(filter);
  }, [load, filter]);

  async function updateStatus(id: string, status: 'resolved' | 'dismissed') {
    setActioningId(id);
    const { error } = await db.from('reports').update({ status }).eq('id', id);
    if (error) {
      Alert.alert('Error', 'Failed to update report.');
    } else {
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
    setActioningId(null);
  }

  return { reports, loading, actioningId, updateStatus };
}

export default function AdminReportsScreen() {
  const [filter, setFilter] = useState<ReportStatus>('open');
  const { reports, loading, actioningId, updateStatus } = useAdminReports(filter);

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Reports</Text>
        <View style={{ width: 64 }} />
      </View>

      <View className="flex-row items-center gap-2 px-4 py-2 border-b border-latte-200 dark:border-ristretto-700">
        {(['open', 'resolved', 'dismissed'] as ReportStatus[]).map((s) => (
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
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : reports.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-latte-600 dark:text-latte-500 text-sm">No {filter} reports.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-3">
          {reports.map((report) => (
            <View
              key={report.id}
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View className="bg-latte-200 dark:bg-ristretto-700 rounded-full px-2 py-0.5">
                      <Text className="text-latte-600 dark:text-latte-400 text-xs capitalize">
                        {report.target_type}
                      </Text>
                    </View>
                    <Text className="text-latte-500 dark:text-latte-600 text-xs">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </Text>
                  </View>
                  <Text
                    className="text-latte-950 dark:text-latte-100 font-medium text-sm"
                    numberOfLines={2}
                  >
                    {report.targetLabel ?? '—'}
                  </Text>
                </View>
                <Text className="text-latte-500 dark:text-latte-600 text-xs ml-3">
                  {new Date(report.created_at).toLocaleDateString()}
                </Text>
              </View>

              {filter === 'open' && (
                <View className="flex-row gap-2 mt-1">
                  {actioningId === report.id ? (
                    <ActivityIndicator color="#ff9d37" size="small" />
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => updateStatus(report.id, 'resolved')}
                        className="flex-1 bg-bloom-600 rounded-xl py-2.5 items-center"
                      >
                        <Text className="text-white font-semibold text-sm">Resolve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => updateStatus(report.id, 'dismissed')}
                        className="flex-1 border border-latte-300 dark:border-ristretto-600 rounded-xl py-2.5 items-center"
                      >
                        <Text className="text-latte-600 dark:text-latte-400 text-sm">Dismiss</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          ))}
          <View className="h-12" />
        </ScrollView>
      )}
    </View>
  );
}
