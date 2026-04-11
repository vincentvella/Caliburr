import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

interface Stats {
  totalUsers: number;
  totalRecipes: number;
  totalGrinders: number;
  totalMachines: number;
  totalBacers: number;
  newUsersThisWeek: number;
  newRecipesThisWeek: number;
  topGrinders: { brand: string; model: string; count: number }[];
  topBeans: { name: string; roaster: string; count: number }[];
  recipesByMethod: { brew_method: string; count: number }[];
}

function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

async function fetchStats(): Promise<Stats> {
  const since = weekAgo();

  const [
    recipesRes,
    grindersRes,
    machinesRes,
    backersRes,
    newRecipesRes,
    topGrindersRes,
    topBeansRes,
    methodsRes,
  ] = await Promise.all([
    supabase.from('recipes').select('*', { count: 'exact', head: true }),
    supabase.from('grinders').select('*', { count: 'exact', head: true }),
    supabase.from('brew_machines').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }).not('backer_tier', 'is', null),
    supabase.from('recipes').select('*', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('recipes').select('grinder_id, grinder:grinders(brand, model)').limit(500),
    supabase
      .from('recipes')
      .select('bean_id, bean:beans(name, roaster)')
      .not('bean_id', 'is', null)
      .limit(500),
    supabase.from('recipes').select('brew_method').limit(500),
  ]);

  // Aggregate top grinders
  const grinderCounts: Record<string, { brand: string; model: string; count: number }> = {};
  for (const r of topGrindersRes.data ?? []) {
    const g = r.grinder as { brand: string; model: string } | null;
    if (!g || !r.grinder_id) continue;
    const key = r.grinder_id as string;
    if (!grinderCounts[key]) grinderCounts[key] = { brand: g.brand, model: g.model, count: 0 };
    grinderCounts[key].count++;
  }
  const topGrinders = Object.values(grinderCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Aggregate top beans
  const beanCounts: Record<string, { name: string; roaster: string; count: number }> = {};
  for (const r of topBeansRes.data ?? []) {
    const b = r.bean as { name: string; roaster: string } | null;
    if (!b || !r.bean_id) continue;
    const key = r.bean_id as string;
    if (!beanCounts[key]) beanCounts[key] = { name: b.name, roaster: b.roaster, count: 0 };
    beanCounts[key].count++;
  }
  const topBeans = Object.values(beanCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Aggregate by brew method
  const methodCounts: Record<string, number> = {};
  for (const r of methodsRes.data ?? []) {
    const m = r.brew_method as string;
    methodCounts[m] = (methodCounts[m] ?? 0) + 1;
  }
  const recipesByMethod = Object.entries(methodCounts)
    .map(([brew_method, count]) => ({ brew_method, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalUsers: 0, // auth.users not accessible without service role
    totalRecipes: recipesRes.count ?? 0,
    totalGrinders: grindersRes.count ?? 0,
    totalMachines: machinesRes.count ?? 0,
    totalBacers: backersRes.count ?? 0,
    newUsersThisWeek: 0,
    newRecipesThisWeek: newRecipesRes.count ?? 0,
    topGrinders,
    topBeans,
    recipesByMethod,
  };
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <View className="flex-1 bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4">
      <Text className="text-latte-500 dark:text-latte-600 text-xs mb-1">{label}</Text>
      <Text className="text-latte-950 dark:text-latte-100 text-2xl font-bold">{value}</Text>
      {sub ? (
        <Text className="text-latte-500 dark:text-latte-600 text-xs mt-0.5">{sub}</Text>
      ) : null}
    </View>
  );
}

function useAdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

export default function AdminStatsScreen() {
  const { stats, loading } = useAdminStats();

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Stats</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : !stats ? null : (
        <ScrollView className="flex-1 px-4 pt-4">
          <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            Totals
          </Text>
          <View className="flex-row gap-3 mb-3">
            <StatCard
              label="Recipes"
              value={stats.totalRecipes}
              sub={`+${stats.newRecipesThisWeek} this week`}
            />
            <StatCard label="Backers" value={stats.totalBacers} />
          </View>
          <View className="flex-row gap-3 mb-6">
            <StatCard label="Grinders" value={stats.totalGrinders} />
            <StatCard label="Machines" value={stats.totalMachines} />
          </View>

          <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            Top Grinders
          </Text>
          <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl mb-6 overflow-hidden">
            {stats.topGrinders.length === 0 ? (
              <Text className="text-latte-500 dark:text-latte-600 text-sm p-4">No data yet.</Text>
            ) : (
              stats.topGrinders.map((g, i) => (
                <View
                  key={i}
                  className={`flex-row items-center justify-between px-4 py-3 ${i < stats.topGrinders.length - 1 ? 'border-b border-latte-200 dark:border-ristretto-700' : ''}`}
                >
                  <Text
                    className="text-latte-950 dark:text-latte-100 text-sm flex-1"
                    numberOfLines={1}
                  >
                    {g.brand} {g.model}
                  </Text>
                  <Text className="text-latte-500 dark:text-latte-600 text-sm ml-3">
                    {g.count} recipes
                  </Text>
                </View>
              ))
            )}
          </View>

          <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            Top Beans
          </Text>
          <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl mb-6 overflow-hidden">
            {stats.topBeans.length === 0 ? (
              <Text className="text-latte-500 dark:text-latte-600 text-sm p-4">No data yet.</Text>
            ) : (
              stats.topBeans.map((b, i) => (
                <View
                  key={i}
                  className={`flex-row items-center justify-between px-4 py-3 ${i < stats.topBeans.length - 1 ? 'border-b border-latte-200 dark:border-ristretto-700' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-latte-950 dark:text-latte-100 text-sm" numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text className="text-latte-500 dark:text-latte-600 text-xs">{b.roaster}</Text>
                  </View>
                  <Text className="text-latte-500 dark:text-latte-600 text-sm ml-3">
                    {b.count} recipes
                  </Text>
                </View>
              ))
            )}
          </View>

          <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            Recipes by Method
          </Text>
          <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl mb-12 overflow-hidden">
            {stats.recipesByMethod.length === 0 ? (
              <Text className="text-latte-500 dark:text-latte-600 text-sm p-4">No data yet.</Text>
            ) : (
              stats.recipesByMethod.map((m, i) => (
                <View
                  key={m.brew_method}
                  className={`flex-row items-center justify-between px-4 py-3 ${i < stats.recipesByMethod.length - 1 ? 'border-b border-latte-200 dark:border-ristretto-700' : ''}`}
                >
                  <Text className="text-latte-950 dark:text-latte-100 text-sm capitalize">
                    {m.brew_method.replace(/_/g, ' ')}
                  </Text>
                  <Text className="text-latte-500 dark:text-latte-600 text-sm">{m.count}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
