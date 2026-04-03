import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { type RecipeWithJoins, type BrewMethod, BREW_METHOD_LABELS } from '@/lib/types';
import { Constants } from '@/lib/database.types';

const BREW_METHODS = [...Constants.public.Enums.brew_method];

// ─── Explore screen ───────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const [recipes, setRecipes] = useState<RecipeWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<BrewMethod | null>(null);
  const [myGearOnly, setMyGearOnly] = useState(false);
  const [myGrinderId, setMyGrinderId] = useState<string[]>([]);

  // Upvotes
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Load user context once ─────────────────────────────────────────────────

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

  // ── Fetch recipes ──────────────────────────────────────────────────────────

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
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

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
    [methodFilter, myGearOnly, myGrinderId],
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
    }, []),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchRecipes();
    setRefreshing(false);
  }

  function handleSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    searchTimer.current = setTimeout(() => fetchRecipes(text), 300);
  }

  // ── Upvote ─────────────────────────────────────────────────────────────────

  async function toggleUpvote(recipeId: string) {
    if (!currentUserId) return;

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
        setUpvotedIds((prev) => new Set(prev).add(recipeId));
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipeId ? { ...r, upvotes: r.upvotes + 1 } : r)),
        );
      }
    } else {
      const { error } = await supabase
        .from('recipe_upvotes')
        .insert({ recipe_id: recipeId, user_id: currentUserId });
      if (error) {
        setUpvotedIds((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipeId ? { ...r, upvotes: r.upvotes - 1 } : r)),
        );
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-ristretto-900">
      {/* Header */}
      <View className="px-4 pt-16 pb-3 gap-3">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-crema-300 text-3xl font-bold leading-tight">Caliburr</Text>
            <Text className="text-latte-500 text-sm">Dial in your perfect cup.</Text>
          </View>
          <TouchableOpacity
            onPress={() => setMyGearOnly((v) => !v)}
            accessibilityLabel={myGearOnly ? 'My Gear filter on' : 'My Gear filter off'}
            accessibilityRole="button"
            className={`px-3 py-2 rounded-xl border ${
              myGearOnly ? 'bg-harvest-500 border-harvest-500' : 'border-ristretto-700'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${myGearOnly ? 'text-white' : 'text-latte-400'}`}
            >
              My Gear
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TextInput
          className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3 text-latte-100 text-sm"
          style={{ lineHeight: undefined }}
          placeholder="Search grinder, bean, method..."
          placeholderTextColor="#6e5a47"
          value={search}
          onChangeText={handleSearchChange}
          clearButtonMode="while-editing"
        />

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
              methodFilter === null ? 'bg-harvest-500 border-harvest-500' : 'border-ristretto-700'
            }`}
          >
            <Text
              className={`text-xs font-medium ${methodFilter === null ? 'text-white' : 'text-latte-400'}`}
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
                  : 'border-ristretto-700'
              }`}
            >
              <Text
                className={`text-xs font-medium ${methodFilter === method ? 'text-white' : 'text-latte-400'}`}
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
          <Text className="text-latte-500 text-sm text-center">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff9d37" />
          }
          onEndReached={fetchMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            recipes.length > 0 ? (
              <Text className="text-latte-600 text-xs mb-3 mt-2">
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
              <Text className="text-latte-500 text-sm text-center">
                {myGearOnly && myGrinderId.length === 0
                  ? 'Add grinders in your profile to filter by gear.'
                  : 'No recipes found. Be the first to submit one.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID="recipe-item"
              activeOpacity={0.85}
              onPress={() => router.push(`/recipe/${item.id}`)}
            >
              <RecipeCard
                recipe={item}
                upvoted={upvotedIds.has(item.id)}
                onUpvote={() => toggleUpvote(item.id)}
              />
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/recipe/new')}
        accessibilityLabel="New recipe"
        accessibilityRole="button"
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
    </View>
  );
}

// ─── Recipe card ──────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  upvoted,
  onUpvote,
}: {
  recipe: RecipeWithJoins;
  upvoted: boolean;
  onUpvote: () => void;
}) {
  const grinderLabel = `${recipe.grinder.brand} ${recipe.grinder.model}`;
  const methodLabel = BREW_METHOD_LABELS[recipe.brew_method];

  return (
    <View className="bg-ristretto-800 rounded-2xl p-4 mb-3 border border-ristretto-700">
      {/* Title row */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          {recipe.bean ? (
            <Text className="text-latte-100 font-semibold text-base" numberOfLines={1}>
              {recipe.bean.name}
              {recipe.bean.roaster ? (
                <Text className="text-latte-500 font-normal text-sm"> · {recipe.bean.roaster}</Text>
              ) : null}
            </Text>
          ) : (
            <Text className="text-latte-100 font-semibold text-base" numberOfLines={1}>
              {grinderLabel}
            </Text>
          )}
          <Text className="text-latte-500 text-xs mt-0.5">
            {recipe.bean ? `${grinderLabel} · ` : ''}
            {methodLabel}
            {recipe.brew_machine
              ? ` · ${recipe.brew_machine.brand} ${recipe.brew_machine.model}`
              : ''}
          </Text>
        </View>
        {recipe.grinder.verified && (
          <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5">
            <Text className="text-bloom-400 text-xs font-medium">Verified</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View className="flex-row flex-wrap gap-x-5 gap-y-2 mt-1">
        <Stat label="Grind" value={recipe.grind_setting} highlight />
        {recipe.dose_g != null && <Stat label="Dose" value={`${recipe.dose_g}g`} />}
        {recipe.yield_g != null && <Stat label="Yield" value={`${recipe.yield_g}g`} />}
        {recipe.ratio != null && <Stat label="Ratio" value={`1:${recipe.ratio}`} />}
        {recipe.brew_time_s != null && <Stat label="Time" value={formatTime(recipe.brew_time_s)} />}
        {recipe.water_temp_c != null && <Stat label="Temp" value={`${recipe.water_temp_c}°C`} />}
      </View>

      {/* Notes */}
      {recipe.notes ? (
        <Text className="text-latte-500 text-xs mt-3 leading-relaxed" numberOfLines={2}>
          {recipe.notes}
        </Text>
      ) : null}

      {/* Footer: roast level + upvote */}
      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-row gap-2">
          {recipe.roast_level ? (
            <View className="bg-ristretto-700 rounded-full px-2 py-0.5">
              <Text className="text-latte-500 text-xs capitalize">
                {recipe.roast_level.replace('_', ' ')}
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onUpvote}
          accessibilityLabel={`${recipe.upvotes} upvote${recipe.upvotes !== 1 ? 's' : ''}. ${upvoted ? 'Remove upvote' : 'Upvote'}`}
          accessibilityRole="button"
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ backgroundColor: upvoted ? '#7c3a1a' : '#2a1c14' }}
        >
          <Text style={{ color: upvoted ? '#ff9d37' : '#6e5a47', fontSize: 14 }}>▲</Text>
          <Text
            className="text-xs font-semibold"
            style={{ color: upvoted ? '#ff9d37' : '#6e5a47' }}
          >
            {recipe.upvotes}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View>
      <Text className="text-latte-600 text-xs">{label}</Text>
      <Text className="font-semibold text-sm" style={{ color: highlight ? '#ff9d37' : '#c8b09a' }}>
        {value}
      </Text>
    </View>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
