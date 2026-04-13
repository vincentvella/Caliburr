import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  type DimensionValue,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { computeGrindStats, type GrindStats } from '@/lib/stats';
import {
  type Grinder,
  type BrewMethod,
  BREW_METHOD_LABELS,
  BURR_TYPE_LABELS,
  ADJUSTMENT_TYPE_LABELS,
} from '@/lib/types';

interface GrinderRecipe {
  id: string;
  brew_method: BrewMethod;
  grind_setting: string;
  dose_g: number | null;
  yield_g: number | null;
  upvotes: number;
  bean: { name: string; roaster: string } | null;
}

function useGrinderDetail(id: string) {
  const [grinder, setGrinder] = useState<Grinder | null>(null);
  const [recipes, setRecipes] = useState<GrinderRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const [grinderRes, recipesRes] = await Promise.all([
        supabase.from('grinders').select('*').eq('id', id).single(),
        supabase
          .from('recipes')
          .select(
            'id, brew_method, grind_setting, dose_g, yield_g, upvotes, bean:beans(name, roaster)',
          )
          .eq('grinder_id', id)
          .order('upvotes', { ascending: false })
          .limit(200),
      ]);

      if (grinderRes.error || !grinderRes.data) {
        setError('Grinder not found.');
      } else {
        setGrinder(grinderRes.data);
        setRecipes((recipesRes.data ?? []) as GrinderRecipe[]);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  return { grinder, recipes, loading, error };
}

/** Group recipes by brew method and compute grind stats for each. */
function useDialInStats(recipes: GrinderRecipe[]) {
  return useMemo(() => {
    const grouped: Partial<Record<BrewMethod, GrinderRecipe[]>> = {};
    for (const r of recipes) {
      if (!grouped[r.brew_method]) grouped[r.brew_method] = [];
      (grouped[r.brew_method] as GrinderRecipe[]).push(r);
    }

    const stats: Partial<Record<BrewMethod, GrindStats | null>> = {};
    for (const [method, methodRecipes] of Object.entries(grouped) as [
      BrewMethod,
      GrinderRecipe[],
    ][]) {
      stats[method] = computeGrindStats(methodRecipes.map((r) => r.grind_setting));
    }

    // Methods sorted by recipe count descending
    const methods = Object.keys(grouped) as BrewMethod[];
    methods.sort((a, b) => (grouped[b]?.length ?? 0) - (grouped[a]?.length ?? 0));

    return { grouped, stats, methods };
  }, [recipes]);
}

export default function GrinderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { grinder, recipes, loading, error } = useGrinderDetail(id);
  const { grouped, stats, methods } = useDialInStats(recipes);
  const [selectedMethod, setSelectedMethod] = useState<BrewMethod | null>(null);

  const activeMethod = selectedMethod ?? methods[0] ?? null;
  const activeRecipes = activeMethod ? (grouped[activeMethod] ?? []) : [];
  const activeStats = activeMethod ? stats[activeMethod] : null;

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Grinder</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : error || !grinder ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-latte-600 dark:text-latte-500 text-sm text-center">
            {error ?? 'Grinder not found.'}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="pb-12">
          {/* Image */}
          {grinder.image_url && grinder.image_status === 'approved' && (
            <Image
              source={{ uri: grinder.image_url }}
              className="w-full h-52 bg-oat-100 dark:bg-ristretto-800"
              resizeMode="contain"
            />
          )}

          <View className="px-4 pt-5 gap-5">
            {/* Header */}
            <View>
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-latte-950 dark:text-latte-100 text-2xl font-display-bold">
                  {grinder.brand} {grinder.model}
                </Text>
              </View>
              {grinder.verified && (
                <View className="flex-row items-center gap-1.5">
                  <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-full px-2.5 py-0.5">
                    <Text className="text-bloom-700 dark:text-bloom-400 text-xs">
                      ✓ Community Verified
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Specs */}
            <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-4 gap-3">
              {grinder.burr_type && (
                <SpecRow label="Burr Type" value={BURR_TYPE_LABELS[grinder.burr_type]} />
              )}
              {grinder.adjustment_type && (
                <SpecRow
                  label="Adjustment"
                  value={ADJUSTMENT_TYPE_LABELS[grinder.adjustment_type]}
                />
              )}
              {grinder.range_min != null && grinder.range_max != null && (
                <SpecRow label="Range" value={`${grinder.range_min} – ${grinder.range_max}`} />
              )}
            </View>

            {/* Dial-in section */}
            {methods.length > 0 ? (
              <View className="gap-4">
                <Text className="text-latte-700 dark:text-latte-400 text-xs font-semibold uppercase tracking-wider">
                  Dial-In Guide
                </Text>

                {/* Brew method filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerClassName="gap-2 pr-4"
                >
                  {methods.map((method) => (
                    <TouchableOpacity
                      key={method}
                      onPress={() => setSelectedMethod(method)}
                      className={`px-3 py-1.5 rounded-full border ${
                        activeMethod === method
                          ? 'bg-harvest-500 border-harvest-500'
                          : 'border-latte-300 dark:border-ristretto-600'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          activeMethod === method
                            ? 'text-white'
                            : 'text-latte-700 dark:text-latte-400'
                        }`}
                      >
                        {BREW_METHOD_LABELS[method]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Stats card */}
                {activeStats ? (
                  <StatsCard stats={activeStats} grinder={grinder} />
                ) : (
                  <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-5 items-center">
                    <Text className="text-latte-500 dark:text-latte-600 text-sm">
                      Not enough numeric data yet ({activeRecipes.length} brew
                      {activeRecipes.length !== 1 ? 's' : ''})
                    </Text>
                  </View>
                )}

                {/* Recipe list for selected method */}
                <Text className="text-latte-700 dark:text-latte-400 text-xs font-semibold uppercase tracking-wider">
                  {activeRecipes.length} Brew{activeRecipes.length !== 1 ? 's' : ''}
                </Text>
                {activeRecipes.map((recipe) => (
                  <TouchableOpacity
                    key={recipe.id}
                    onPress={() => router.push(`/recipe/${recipe.id}`)}
                    className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-3">
                        <Text className="text-latte-950 dark:text-latte-100 font-medium text-sm">
                          {recipe.bean ? `${recipe.bean.name} · ${recipe.bean.roaster}` : 'No bean'}
                        </Text>
                        <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5">
                          Setting {recipe.grind_setting}
                          {recipe.dose_g && recipe.yield_g
                            ? ` · ${recipe.dose_g}g → ${recipe.yield_g}g`
                            : ''}
                        </Text>
                      </View>
                      {recipe.upvotes > 0 && (
                        <Text className="text-harvest-500 text-xs font-semibold">
                          ▲ {recipe.upvotes}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="items-center py-8">
                <Text className="text-latte-500 dark:text-latte-600 text-sm">
                  No recipes yet for this grinder.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function StatsCard({ stats, grinder }: { stats: GrindStats; grinder: Grinder }) {
  const rangeMin = grinder.range_min;
  const rangeMax = grinder.range_max;
  const hasRange = rangeMin != null && rangeMax != null && rangeMax > rangeMin;

  // Bar position helpers (0–1 within the grinder's range, or within data range)
  const dataMin = Math.min(stats.q1, stats.outlierLow);
  const dataMax = Math.max(stats.q3, stats.outlierHigh);
  const barMin = hasRange ? rangeMin : dataMin;
  const barMax = hasRange ? rangeMax : dataMax;
  const barRange = barMax - barMin || 1;

  function pct(val: number): DimensionValue {
    return `${Math.max(0, Math.min(100, ((val - barMin) / barRange) * 100)).toFixed(1)}%` as DimensionValue;
  }

  return (
    <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-5 gap-4">
      {/* Key numbers */}
      <View className="flex-row gap-3">
        <View className="flex-1 items-center">
          <Text className="text-latte-500 dark:text-latte-600 text-xs mb-1">Median</Text>
          <Text className="text-latte-950 dark:text-latte-100 text-3xl font-display-bold">
            {stats.median % 1 === 0 ? stats.median.toFixed(0) : stats.median.toFixed(1)}
          </Text>
          <Text className="text-latte-500 dark:text-latte-600 text-xs mt-0.5">
            {stats.count} recipe{stats.count !== 1 ? 's' : ''}
          </Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-latte-500 dark:text-latte-600 text-xs mb-1">Sweet Spot</Text>
          <Text className="text-latte-950 dark:text-latte-100 text-lg font-semibold">
            {stats.q1 % 1 === 0 ? stats.q1.toFixed(0) : stats.q1.toFixed(1)}
            {' – '}
            {stats.q3 % 1 === 0 ? stats.q3.toFixed(0) : stats.q3.toFixed(1)}
          </Text>
          <Text className="text-latte-500 dark:text-latte-600 text-xs mt-0.5">middle 50%</Text>
        </View>
      </View>

      {/* Range bar */}
      <View className="gap-1.5">
        <View className="h-3 bg-latte-200 dark:bg-ristretto-700 rounded-full overflow-hidden relative">
          {/* IQR band */}
          <View
            className="absolute h-full bg-harvest-400/50 rounded-full"
            style={{ left: pct(stats.q1), width: pct(stats.q3 + barMin - stats.q1) }}
          />
          {/* Median tick */}
          <View
            className="absolute h-full w-0.5 bg-harvest-500"
            style={{ left: pct(stats.median) }}
          />
        </View>
        {hasRange && (
          <View className="flex-row justify-between">
            <Text className="text-latte-400 dark:text-latte-700 text-xs">{rangeMin}</Text>
            <Text className="text-latte-400 dark:text-latte-700 text-xs">{rangeMax}</Text>
          </View>
        )}
      </View>

      <Text className="text-latte-500 dark:text-latte-600 text-xs">
        Orange band = middle 50% of recipes. Tick = median. Settings outside{' '}
        {stats.outlierLow.toFixed(1)}–{stats.outlierHigh.toFixed(1)} are outliers.
      </Text>
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-latte-600 dark:text-latte-500 text-sm">{label}</Text>
      <Text className="text-latte-950 dark:text-latte-100 text-sm font-medium">{value}</Text>
    </View>
  );
}
