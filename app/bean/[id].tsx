import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BREW_METHOD_LABELS, ROAST_LEVEL_LABELS, type Bean, type BrewMethod } from '@/lib/types';

interface BeanRecipe {
  id: string;
  brew_method: string;
  grind_setting: string;
  dose_g: number | null;
  yield_g: number | null;
  upvotes: number;
  grinder: { brand: string; model: string };
}

function useBeanDetail(id: string) {
  const [bean, setBean] = useState<Bean | null>(null);
  const [recipes, setRecipes] = useState<BeanRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const [beanRes, recipesRes] = await Promise.all([
        supabase.from('beans').select('*').eq('id', id).single(),
        supabase
          .from('recipes')
          .select(
            'id, brew_method, grind_setting, dose_g, yield_g, upvotes, grinder:grinders(brand, model)',
          )
          .eq('bean_id', id)
          .order('upvotes', { ascending: false })
          .limit(50),
      ]);

      if (beanRes.error || !beanRes.data) {
        setError('Bean not found.');
      } else {
        setBean(beanRes.data);
        setRecipes((recipesRes.data ?? []) as BeanRecipe[]);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  return { bean, recipes, loading, error };
}

export default function BeanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bean, recipes, loading, error } = useBeanDetail(id);
  const [methodFilter, setMethodFilter] = useState<BrewMethod | null>(null);

  const methods = useMemo(
    () => [...new Set(recipes.map((r) => r.brew_method as BrewMethod))],
    [recipes],
  );
  const visibleRecipes = methodFilter
    ? recipes.filter((r) => r.brew_method === methodFilter)
    : recipes;

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold" numberOfLines={1}>
          Bean
        </Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : error || !bean ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-latte-600 dark:text-latte-500 text-sm text-center">
            {error ?? 'Bean not found.'}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-4 pt-5 pb-12">
          {/* Bean header */}
          <View className="mb-5">
            <Text className="text-latte-950 dark:text-latte-100 text-2xl font-display-bold">
              {bean.name}
            </Text>
            <Text className="text-latte-600 dark:text-latte-500 text-sm mt-0.5">
              {bean.roaster}
            </Text>
          </View>

          {/* Meta chips */}
          <View className="flex-row flex-wrap gap-2 mb-5">
            {bean.origin && <InfoChip label="Origin" value={bean.origin} />}
            {bean.process && <InfoChip label="Process" value={bean.process} />}
            {bean.roast_level && (
              <InfoChip label="Roast" value={ROAST_LEVEL_LABELS[bean.roast_level]} />
            )}
          </View>

          {/* Tasting notes */}
          {bean.tasting_notes.length > 0 && (
            <View className="mb-6">
              <Text className="text-latte-700 dark:text-latte-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Tasting Notes
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {bean.tasting_notes.map((note) => (
                  <View key={note} className="bg-bloom-600/15 rounded-full px-3 py-1">
                    <Text className="text-bloom-600 dark:text-bloom-400 text-sm capitalize">
                      {note}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recipes using this bean */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-latte-700 dark:text-latte-400 text-xs font-semibold uppercase tracking-wider">
              {recipes.length > 0
                ? `${visibleRecipes.length} Brew${visibleRecipes.length !== 1 ? 's' : ''}`
                : 'No Brews Yet'}
            </Text>
          </View>
          {methods.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerClassName="gap-2 mb-4"
            >
              <TouchableOpacity
                onPress={() => setMethodFilter(null)}
                className={`px-3 py-1.5 rounded-full border ${
                  methodFilter === null
                    ? 'bg-harvest-500 border-harvest-500'
                    : 'border-latte-300 dark:border-ristretto-600'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${methodFilter === null ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
                >
                  All
                </Text>
              </TouchableOpacity>
              {methods.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMethodFilter(m === methodFilter ? null : m)}
                  className={`px-3 py-1.5 rounded-full border ${
                    methodFilter === m
                      ? 'bg-harvest-500 border-harvest-500'
                      : 'border-latte-300 dark:border-ristretto-600'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${methodFilter === m ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
                  >
                    {BREW_METHOD_LABELS[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {recipes.length === 0 && (
            <TouchableOpacity
              onPress={() => router.push('/recipe/new')}
              className="bg-oat-100 dark:bg-ristretto-800 border border-dashed border-latte-300 dark:border-ristretto-600 rounded-2xl px-4 py-6 items-center gap-2"
            >
              <Text className="text-latte-500 dark:text-latte-600 text-sm">
                No brews with this bean yet.
              </Text>
              <Text className="text-harvest-400 font-semibold text-sm">Be the first →</Text>
            </TouchableOpacity>
          )}
          {visibleRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              onPress={() => router.push(`/recipe/${recipe.id}`)}
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5 mb-3"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-latte-950 dark:text-latte-100 font-medium text-sm">
                    {recipe.grinder.brand} {recipe.grinder.model}
                  </Text>
                  <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5">
                    {BREW_METHOD_LABELS[recipe.brew_method as keyof typeof BREW_METHOD_LABELS] ??
                      recipe.brew_method}
                    {recipe.grind_setting ? ` · Setting ${recipe.grind_setting}` : ''}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  {recipe.upvotes > 0 && (
                    <Text className="text-harvest-500 text-xs font-semibold">
                      ▲ {recipe.upvotes}
                    </Text>
                  )}
                  {recipe.dose_g && recipe.yield_g && (
                    <Text className="text-latte-500 dark:text-latte-600 text-xs">
                      {recipe.dose_g}g → {recipe.yield_g}g
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-3 py-2">
      <Text className="text-latte-500 dark:text-latte-600 text-xs">{label}</Text>
      <Text className="text-latte-950 dark:text-latte-100 text-sm font-medium capitalize">
        {value}
      </Text>
    </View>
  );
}
