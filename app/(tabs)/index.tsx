import { textInputStyle } from '@/lib/styles';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';

import { LegendList } from '@legendapp/list';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { haptics } from '@/lib/haptics';
import { type RecipeWithJoins, type BrewMethod, BREW_METHOD_LABELS } from '@/lib/types';
import { Constants } from '@/lib/database.types';
import { RecipeCard } from '@/components/RecipeCard';

const BREW_METHODS = [...Constants.public.Enums.brew_method];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useBackerIds() {
  const [backerIds, setBackerIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    db.from('profiles')
      .select('user_id')
      .not('backer_tier', 'is', null)
      .then(({ data }) => {
        setBackerIds(new Set((data ?? []).map((p) => p.user_id)));
      });
  }, []);
  return backerIds;
}

function useUserContext() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myGrinderId, setMyGrinderId] = useState<string[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);

      const [grindersRes, upvotesRes] = await Promise.all([
        supabase.from('user_grinders').select('grinder_id').eq('user_id', user.id),
        supabase.from('recipe_upvotes').select('recipe_id').eq('user_id', user.id),
      ]);

      setMyGrinderId((grindersRes.data ?? []).map((r) => r.grinder_id));
      setUpvotedIds(new Set((upvotesRes.data ?? []).map((r) => r.recipe_id)));
    });
  }, []);

  return { currentUserId, myGrinderId, upvotedIds, setUpvotedIds };
}

export type SortMode = 'trending' | 'top' | 'new';

function useRecipes(myGrinderId: string[]) {
  const [recipes, setRecipes] = useState<RecipeWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<BrewMethod | null>(null);
  const [myGearOnly, setMyGearOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('top');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const PAGE_SIZE = 50;

  const buildQuery = useCallback(
    async (searchText: string, offset: number) => {
      let q = supabase
        .from('recipes')
        .select(
          `
        *,
        grinder:grinders(brand, model, verified, burr_type, adjustment_type),
        bean:beans(name, roaster, origin, process, roast_level),
        brew_machine:brew_machines(brand, model, machine_type, verified)
      `,
        )
        .range(offset, offset + PAGE_SIZE - 1);

      if (sortMode === 'new') {
        q = q.order('created_at', { ascending: false });
      } else {
        q = q.order('upvotes', { ascending: false }).order('created_at', { ascending: false });
      }

      if (sortMode === 'trending') {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        q = q.gte('created_at', since);
      }

      if (methodFilter) q = q.eq('brew_method', methodFilter);
      if (myGearOnly && myGrinderId.length) q = q.in('grinder_id', myGrinderId);

      if (searchText.trim()) {
        const term = `%${searchText.trim()}%`;
        const [grindersRes, beansRes, machinesRes] = await Promise.all([
          supabase.from('grinders').select('id').or(`brand.ilike.${term},model.ilike.${term}`),
          supabase.from('beans').select('id').or(`name.ilike.${term},roaster.ilike.${term}`),
          supabase.from('brew_machines').select('id').or(`brand.ilike.${term},model.ilike.${term}`),
        ]);

        const grinderIds = (grindersRes.data ?? []).map((r) => r.id);
        const beanIds = (beansRes.data ?? []).map((r) => r.id);
        const machineIds = (machinesRes.data ?? []).map((r) => r.id);

        const orFilters: string[] = [];
        if (grinderIds.length) orFilters.push(`grinder_id.in.(${grinderIds.join(',')})`);
        if (beanIds.length) orFilters.push(`bean_id.in.(${beanIds.join(',')})`);
        if (machineIds.length) orFilters.push(`brew_machine_id.in.(${machineIds.join(',')})`);

        const matchingMethods = BREW_METHODS.filter((m) =>
          BREW_METHOD_LABELS[m].toLowerCase().includes(searchText.toLowerCase()),
        );
        if (matchingMethods.length) orFilters.push(`brew_method.in.(${matchingMethods.join(',')})`);

        if (!orFilters.length) return null;
        q = q.or(orFilters.join(','));
      }

      return q;
    },
    [sortMode, methodFilter, myGearOnly, myGrinderId],
  );

  const fetchRecipes = useCallback(
    async (searchText = search) => {
      const q = await buildQuery(searchText, 0);
      if (!q) {
        setRecipes([]);
        setHasMore(false);
        setError(null);
        return;
      }
      const { data, error } = await q;
      if (error) {
        setError(error.message);
        return;
      }
      const results = data as RecipeWithJoins[];
      setRecipes(results);
      setHasMore(results.length === PAGE_SIZE);
      setError(null);
    },
    [buildQuery, search],
  );

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const q = await buildQuery(search, recipes.length);
    if (q) {
      const { data } = await q;
      if (data) {
        const next = data as RecipeWithJoins[];
        setRecipes((prev) => [...prev, ...next]);
        setHasMore(next.length === PAGE_SIZE);
      }
    }
    setLoadingMore(false);
  }, [buildQuery, search, recipes.length, loadingMore, hasMore]);

  useEffect(() => {
    setHasMore(true);
    setLoading(true);
    fetchRecipes().finally(() => setLoading(false));
  }, [fetchRecipes]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchRecipes();
    setRefreshing(false);
  }

  function handleSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchRecipes(text), 300);
  }

  return {
    recipes,
    setRecipes,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    search,
    sortMode,
    methodFilter,
    myGearOnly,
    setSortMode,
    setMethodFilter,
    setMyGearOnly,
    fetchMore,
    handleRefresh,
    handleSearchChange,
  };
}

// ─── Explore screen ───────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWide = width >= 768;
  const numColumns = (isWeb || isWide) && width >= 900 ? 2 : 1;

  const { currentUserId, myGrinderId, upvotedIds, setUpvotedIds } = useUserContext();
  const backerIds = useBackerIds();
  const {
    recipes,
    setRecipes,
    loading,
    refreshing,
    loadingMore,
    error,
    search,
    sortMode,
    methodFilter,
    myGearOnly,
    setSortMode,
    setMethodFilter,
    setMyGearOnly,
    fetchMore,
    handleRefresh,
    handleSearchChange,
  } = useRecipes(myGrinderId);

  // Re-fetch upvoted IDs when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return;
        const { data } = await supabase
          .from('recipe_upvotes')
          .select('recipe_id')
          .eq('user_id', user.id);
        setUpvotedIds(new Set((data ?? []).map((r) => r.recipe_id)));
      });
    }, [setUpvotedIds]),
  );

  // ── Upvote ─────────────────────────────────────────────────────────────────

  async function toggleUpvote(recipeId: string) {
    if (!currentUserId) return;
    haptics.medium();

    const hasUpvoted = upvotedIds.has(recipeId);

    // Optimistic update
    setUpvotedIds((prev) => {
      const next = new Set(prev);
      if (hasUpvoted) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId ? { ...r, upvotes: r.upvotes + (hasUpvoted ? -1 : 1) } : r,
      ),
    );

    if (hasUpvoted) {
      const { error } = await supabase
        .from('recipe_upvotes')
        .delete()
        .eq('recipe_id', recipeId)
        .eq('user_id', currentUserId);
      if (error) {
        haptics.error();
        setUpvotedIds((prev) => new Set(prev).add(recipeId));
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipeId ? { ...r, upvotes: r.upvotes + 1 } : r)),
        );
        Alert.alert('Error', 'Failed to remove upvote. Please try again.');
      }
    } else {
      const { error } = await supabase
        .from('recipe_upvotes')
        .insert({ recipe_id: recipeId, user_id: currentUserId });
      if (error) {
        haptics.error();
        setUpvotedIds((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipeId ? { ...r, upvotes: r.upvotes - 1 } : r)),
        );
        Alert.alert('Error', 'Failed to upvote. Please try again.');
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      {/* Header */}
      <View className={`px-4 pb-3 gap-3 ${isWeb || isWide ? 'pt-8' : 'pt-16'}`}>
        {!isWeb && !isWide && (
          <View>
            <Text className="text-harvest-600 dark:text-crema-300 text-2xl leading-tight font-display-bold">
              Caliburr
            </Text>
            <Text className="text-latte-600 dark:text-latte-500 text-sm">
              Dial in your perfect cup.
            </Text>
          </View>
        )}

        {/* Search */}
        <TextInput
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3 text-latte-950 dark:text-latte-100 text-sm"
          style={textInputStyle}
          placeholder="Search grinder, bean, method..."
          placeholderTextColor="#6e5a47"
          value={search}
          onChangeText={handleSearchChange}
          clearButtonMode="while-editing"
        />

        {/* Sort mode + My Gear */}
        <View className="flex-row gap-2 flex-wrap">
          {(['top', 'trending', 'new'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setSortMode(mode)}
              className={`px-3 py-1.5 rounded-full border ${
                sortMode === mode
                  ? 'bg-harvest-500 border-harvest-500'
                  : 'border-latte-200 dark:border-ristretto-700'
              }`}
            >
              <Text
                className={`text-xs font-medium capitalize ${sortMode === mode ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
              >
                {mode === 'trending' ? '🔥 Trending' : mode === 'top' ? '▲ Top' : '✦ New'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setMyGearOnly((v) => !v)}
            accessibilityLabel={myGearOnly ? 'My Gear filter on' : 'My Gear filter off'}
            accessibilityRole="button"
            className={`px-3 py-1.5 rounded-full border ${
              myGearOnly
                ? 'bg-harvest-500 border-harvest-500'
                : 'border-latte-200 dark:border-ristretto-700'
            }`}
          >
            <Text
              className={`text-xs font-medium ${myGearOnly ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
            >
              ⚙ My Gear
            </Text>
          </TouchableOpacity>
        </View>

        {/* Method filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <TouchableOpacity
            onPress={() => setMethodFilter(null)}
            accessibilityLabel={methodFilter === null ? 'All methods, selected' : 'All methods'}
            accessibilityRole="button"
            className={`px-3 py-1.5 rounded-full border ${
              methodFilter === null
                ? 'bg-harvest-500 border-harvest-500'
                : 'border-latte-200 dark:border-ristretto-700'
            }`}
          >
            <Text
              className={`text-xs font-medium ${methodFilter === null ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
            >
              All
            </Text>
          </TouchableOpacity>
          {BREW_METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              onPress={() => setMethodFilter(methodFilter === method ? null : method)}
              accessibilityLabel={
                methodFilter === method
                  ? `${BREW_METHOD_LABELS[method]}, selected`
                  : BREW_METHOD_LABELS[method]
              }
              accessibilityRole="button"
              className={`px-3 py-1.5 rounded-full border ${
                methodFilter === method
                  ? 'bg-harvest-500 border-harvest-500'
                  : 'border-latte-200 dark:border-ristretto-700'
              }`}
            >
              <Text
                className={`text-xs font-medium ${methodFilter === method ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
              >
                {BREW_METHOD_LABELS[method]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recipe list */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-latte-600 dark:text-latte-500 text-sm text-center">{error}</Text>
        </View>
      ) : (
        <LegendList
          data={recipes}
          keyExtractor={(r) => r.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff9d37" />
          }
          onEndReached={fetchMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            recipes.length > 0 ? (
              <Text className="text-latte-500 dark:text-latte-600 text-xs mb-3 mt-2">
                {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#ff9d37" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-latte-600 dark:text-latte-500 text-sm text-center">
                {myGearOnly && myGrinderId.length === 0
                  ? 'Add grinders in your profile to filter by gear.'
                  : 'No brews found. Be the first to submit one.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID="recipe-item"
              activeOpacity={0.85}
              onPress={() => router.push(`/recipe/${item.id}`)}
              style={numColumns > 1 ? { flex: 1, marginHorizontal: 4 } : undefined}
            >
              <RecipeCard
                recipe={item}
                upvoted={upvotedIds.has(item.id)}
                onUpvote={() => toggleUpvote(item.id)}
                isAuthorBacker={backerIds.has(item.user_id)}
              />
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB — native only; web uses the nav bar button */}
      {!isWeb && (
        <TouchableOpacity
          onPress={() => router.push('/recipe/new')}
          accessibilityLabel="New brew"
          accessibilityRole="button"
          testID="fab-new-recipe"
          className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-harvest-500 items-center justify-center"
          style={{
            elevation: 6,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
          }}
        >
          <Text className="text-white text-3xl font-light">+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
