import { textInputStyle } from '@/lib/styles';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BREW_METHOD_LABELS } from '@/lib/types';

const PAGE = 50;

interface AdminRecipe {
  id: string;
  grind_setting: string;
  brew_method: string;
  notes: string | null;
  upvotes: number;
  created_at: string;
  user_id: string | null;
  grinder: { brand: string; model: string } | null;
  bean: { name: string; roaster: string } | null;
}

function useAdminRecipes() {
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRecipes = useCallback(async (query: string, offset: number) => {
    const builder = supabase
      .from('recipes')
      .select(
        'id, grind_setting, brew_method, notes, upvotes, created_at, user_id, grinder:grinders(brand, model), bean:beans(name, roaster)',
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);

    if (query.trim()) {
      builder.ilike('notes', `%${query.trim()}%`);
    }

    const { data } = await builder;
    return (data ?? []) as AdminRecipe[];
  }, []);

  const load = useCallback(
    async (query: string) => {
      setLoading(true);
      setHasMore(true);
      const data = await fetchRecipes(query, 0);
      setRecipes(data);
      setHasMore(data.length === PAGE);
      setLoading(false);
    },
    [fetchRecipes],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const data = await fetchRecipes(search, recipes.length);
    setRecipes((prev) => [...prev, ...data]);
    setHasMore(data.length === PAGE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchRecipes, search, recipes.length]);

  useEffect(() => {
    load('');
  }, [load]);

  function onSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(text), 400);
  }

  function confirmDelete(recipe: AdminRecipe) {
    const title = recipe.grinder ? `${recipe.grinder.brand} ${recipe.grinder.model}` : 'Recipe';
    Alert.alert('Delete Recipe', `Remove this ${title} recipe? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteRecipe(recipe.id),
      },
    ]);
  }

  async function deleteRecipe(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) {
      Alert.alert('Error', 'Failed to delete recipe.');
    } else {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
    setDeletingId(null);
  }

  return {
    recipes,
    loading,
    loadingMore,
    search,
    deletingId,
    loadMore,
    onSearchChange,
    confirmDelete,
  };
}

export default function AdminRecipesScreen() {
  const {
    recipes,
    loading,
    loadingMore,
    search,
    deletingId,
    loadMore,
    onSearchChange,
    confirmDelete,
  } = useAdminRecipes();

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Recipes</Text>
        <View style={{ width: 64 }} />
      </View>

      <View className="px-4 pt-3 pb-2">
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search notes…"
          placeholderTextColor="#9b7b60"
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3 text-latte-950 dark:text-latte-100 text-sm"
          style={textInputStyle}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(r) => r.id}
          contentContainerClassName="px-4 pt-1 pb-12"
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-latte-600 dark:text-latte-500 text-sm">No recipes found.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#ff9d37" style={{ marginTop: 12 }} /> : null
          }
          renderItem={({ item }) => (
            <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4 mb-3">
              <View className="flex-row items-start justify-between gap-3 mb-1">
                <View className="flex-1">
                  <Text
                    className="text-latte-950 dark:text-latte-100 font-semibold"
                    numberOfLines={1}
                  >
                    {item.grinder
                      ? `${item.grinder.brand} ${item.grinder.model}`
                      : 'Unknown grinder'}
                  </Text>
                  {item.bean && (
                    <Text
                      className="text-latte-600 dark:text-latte-500 text-xs mt-0.5"
                      numberOfLines={1}
                    >
                      {item.bean.name} · {item.bean.roaster}
                    </Text>
                  )}
                </View>
                {deletingId === item.id ? (
                  <ActivityIndicator color="#ff9d37" size="small" />
                ) : (
                  <TouchableOpacity
                    onPress={() => confirmDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text className="text-red-400 font-medium text-sm">Delete</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-2">
                <Text className="text-latte-600 dark:text-latte-500 text-xs">
                  {BREW_METHOD_LABELS[item.brew_method as keyof typeof BREW_METHOD_LABELS] ??
                    item.brew_method}
                </Text>
                <Text className="text-latte-600 dark:text-latte-500 text-xs">
                  Grind {item.grind_setting}
                </Text>
                <Text className="text-latte-600 dark:text-latte-500 text-xs">{item.upvotes} ↑</Text>
                {!item.user_id && (
                  <Text className="text-latte-500 dark:text-latte-600 text-xs italic">
                    anonymised
                  </Text>
                )}
              </View>

              {item.notes ? (
                <Text
                  className="text-latte-700 dark:text-latte-300 text-sm leading-5 mt-2"
                  numberOfLines={3}
                >
                  {item.notes}
                </Text>
              ) : null}

              <Text className="text-latte-400 dark:text-latte-700 text-xs mt-2">
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
