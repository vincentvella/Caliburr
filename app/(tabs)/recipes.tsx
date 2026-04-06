import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { type RecipeWithJoins } from '@/lib/types';
import { useScreenshotMode } from '@/lib/useScreenshotMode';
import { MyRecipeCard } from '@/components/MyRecipeCard';

const GRINDER = {
  brand: 'Niche',
  model: 'Zero',
  verified: true,
  burr_type: 'conical' as const,
  adjustment_type: 'stepless' as const,
};

const MOCK_MINE: RecipeWithJoins[] = [
  {
    id: '1',
    user_id: '',
    grinder_id: '',
    bean_id: '1',
    brew_machine_id: null,
    brew_method: 'espresso',
    grind_setting: '22',
    dose_g: 18,
    yield_g: 36,
    brew_time_s: 28,
    water_temp_c: 93,
    ratio: 2.0,
    roast_date: '2026-03-28',
    roast_level: 'light',
    notes: 'Bright and floral. Nudge up a click if sour.',
    upvotes: 42,
    created_at: '',
    updated_at: '',
    grinder: GRINDER,
    bean: {
      name: 'Ethiopia Yirgacheffe',
      roaster: 'Blue Bottle',
      origin: 'Ethiopia',
      process: 'Washed',
      roast_level: 'light',
    },
    brew_machine: null,
  },
  {
    id: '2',
    user_id: '',
    grinder_id: '',
    bean_id: '2',
    brew_machine_id: null,
    brew_method: 'pour_over',
    grind_setting: '26',
    dose_g: 15,
    yield_g: null,
    brew_time_s: 210,
    water_temp_c: 94,
    ratio: null,
    roast_date: '2026-03-21',
    roast_level: 'medium_light',
    notes: 'Juicy, blackcurrant notes. Use 30s bloom.',
    upvotes: 37,
    created_at: '',
    updated_at: '',
    grinder: GRINDER,
    bean: {
      name: 'Kenya AA',
      roaster: 'Stumptown',
      origin: 'Kenya',
      process: 'Washed',
      roast_level: 'medium_light',
    },
    brew_machine: null,
  },
  {
    id: '3',
    user_id: '',
    grinder_id: '',
    bean_id: '3',
    brew_machine_id: null,
    brew_method: 'espresso',
    grind_setting: '22',
    dose_g: 18,
    yield_g: 38,
    brew_time_s: 29,
    water_temp_c: 92,
    ratio: 2.11,
    roast_date: '2026-04-01',
    roast_level: 'medium',
    notes: 'Caramel sweetness, clean finish.',
    upvotes: 31,
    created_at: '',
    updated_at: '',
    grinder: GRINDER,
    bean: {
      name: 'Colombia Huila',
      roaster: 'Onyx Coffee Lab',
      origin: 'Colombia',
      process: 'Natural',
      roast_level: 'medium',
    },
    brew_machine: null,
  },
  {
    id: '4',
    user_id: '',
    grinder_id: '',
    bean_id: null,
    brew_machine_id: null,
    brew_method: 'french_press',
    grind_setting: '40',
    dose_g: 30,
    yield_g: null,
    brew_time_s: 240,
    water_temp_c: 93,
    ratio: null,
    roast_date: null,
    roast_level: null,
    notes: 'My baseline French Press. Coarse, 4 min steep, slow plunge.',
    upvotes: 9,
    created_at: '',
    updated_at: '',
    grinder: GRINDER,
    bean: null,
    brew_machine: null,
  },
];

const MOCK_LIKED: RecipeWithJoins[] = [
  {
    id: '5',
    user_id: '',
    grinder_id: '',
    bean_id: '5',
    brew_machine_id: null,
    brew_method: 'aeropress',
    grind_setting: '15',
    dose_g: 15,
    yield_g: 200,
    brew_time_s: 90,
    water_temp_c: 85,
    ratio: null,
    roast_date: '2026-03-14',
    roast_level: 'medium_light',
    notes: 'Inverted, 2 min steep. Sweet and syrupy.',
    upvotes: 58,
    created_at: '',
    updated_at: '',
    grinder: {
      brand: 'Comandante',
      model: 'C40 MK4',
      verified: true,
      burr_type: 'conical' as const,
      adjustment_type: 'stepped' as const,
    },
    bean: {
      name: 'Guatemala Huehuetenango',
      roaster: 'Counter Culture',
      origin: 'Guatemala',
      process: 'Honey',
      roast_level: 'medium_light',
    },
    brew_machine: null,
  },
  {
    id: '6',
    user_id: '',
    grinder_id: '',
    bean_id: '6',
    brew_machine_id: null,
    brew_method: 'chemex',
    grind_setting: '30',
    dose_g: 42,
    yield_g: 700,
    brew_time_s: 270,
    water_temp_c: 96,
    ratio: null,
    roast_date: '2026-03-28',
    roast_level: 'light',
    notes: 'Elegant and clean. 4-pour method, 45s intervals.',
    upvotes: 44,
    created_at: '',
    updated_at: '',
    grinder: {
      brand: 'Baratza',
      model: 'Vario+',
      verified: true,
      burr_type: 'flat' as const,
      adjustment_type: 'stepped' as const,
    },
    bean: {
      name: 'Panama Geisha',
      roaster: 'Onyx Coffee Lab',
      origin: 'Panama',
      process: 'Washed',
      roast_level: 'light',
    },
    brew_machine: null,
  },
  {
    id: '7',
    user_id: '',
    grinder_id: '',
    bean_id: '7',
    brew_machine_id: null,
    brew_method: 'espresso',
    grind_setting: '1.2',
    dose_g: 20,
    yield_g: 40,
    brew_time_s: 32,
    water_temp_c: 93,
    ratio: 2.0,
    roast_date: '2026-04-01',
    roast_level: 'medium',
    notes: 'Chocolatey and balanced. Works great as a milk drink too.',
    upvotes: 29,
    created_at: '',
    updated_at: '',
    grinder: {
      brand: 'Eureka',
      model: 'Mignon Specialità',
      verified: true,
      burr_type: 'flat' as const,
      adjustment_type: 'stepless' as const,
    },
    bean: {
      name: 'Brazil Sul de Minas',
      roaster: 'Intelligentsia',
      origin: 'Brazil',
      process: 'Natural',
      roast_level: 'medium',
    },
    brew_machine: null,
  },
];

export default function RecipesScreen() {
  const screenshotMode = useScreenshotMode();
  const [tab, setTab] = useState<'mine' | 'liked'>('mine');
  const [recipes, setRecipes] = useState<RecipeWithJoins[]>([]);
  const [loading, setLoading] = useState(!screenshotMode);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRecipes = screenshotMode ? (tab === 'mine' ? MOCK_MINE : MOCK_LIKED) : recipes;

  const SELECT =
    '*, grinder:grinders(brand, model, verified, burr_type, adjustment_type), bean:beans(name, roaster, origin, process, roast_level), brew_machine:brew_machines(brand, model, machine_type, verified)';

  const fetchMine = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('recipes')
      .select(SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setRecipes(data as RecipeWithJoins[]);
  }, []);

  const fetchLiked = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: upvoteRows } = await supabase
      .from('recipe_upvotes')
      .select('recipe_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const ids = (upvoteRows ?? []).map((r) => r.recipe_id);
    if (!ids.length) {
      setRecipes([]);
      return;
    }

    const { data, error } = await supabase.from('recipes').select(SELECT).in('id', ids);

    if (error) setError(error.message);
    else {
      // Preserve upvote order
      const byId = new Map((data as RecipeWithJoins[]).map((r) => [r.id, r]));
      setRecipes(ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])));
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    if (screenshotMode) return;
    if (tab === 'mine') await fetchMine();
    else await fetchLiked();
  }, [tab, fetchMine, fetchLiked, screenshotMode]);

  useFocusEffect(
    useCallback(() => {
      if (screenshotMode) return;
      setLoading(true);
      fetchRecipes().finally(() => setLoading(false));
    }, [fetchRecipes, screenshotMode]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchRecipes();
    setRefreshing(false);
  }

  async function handleDelete(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id);

    if (!error) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <ScrollView
        className="flex-1 px-4 pt-16"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff9d37" />
        }
      >
        <Text className="text-latte-950 dark:text-latte-100 text-2xl mb-1 font-display-bold">
          My Recipes
        </Text>
        <Text className="text-latte-600 dark:text-latte-500 text-sm mb-5">
          Your submitted dials.
        </Text>

        {/* Tab toggle */}
        <View className="flex-row bg-oat-100 dark:bg-ristretto-800 rounded-xl p-1 mb-6">
          <TouchableOpacity
            onPress={() => setTab('mine')}
            className={`flex-1 py-2 rounded-lg items-center ${tab === 'mine' ? 'bg-oat-200 dark:bg-ristretto-700' : ''}`}
            accessibilityRole="button"
            accessibilityLabel="My Recipes tab"
          >
            <Text
              className={`text-sm font-medium ${tab === 'mine' ? 'text-latte-950 dark:text-latte-100' : 'text-latte-600 dark:text-latte-500'}`}
            >
              My Recipes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('liked')}
            className={`flex-1 py-2 rounded-lg items-center ${tab === 'liked' ? 'bg-oat-200 dark:bg-ristretto-700' : ''}`}
            accessibilityRole="button"
            accessibilityLabel="Liked Recipes tab"
            testID="tab-liked"
          >
            <Text
              className={`text-sm font-medium ${tab === 'liked' ? 'text-latte-950 dark:text-latte-100' : 'text-latte-600 dark:text-latte-500'}`}
            >
              Liked
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#ff9d37" />
          </View>
        ) : error ? (
          <View className="items-center py-12">
            <Text className="text-latte-600 dark:text-latte-500 text-sm">{error}</Text>
          </View>
        ) : displayRecipes.length === 0 ? (
          <View className="items-center py-12 gap-3">
            {tab === 'mine' ? (
              <>
                <Text className="text-latte-600 dark:text-latte-500 text-sm">No recipes yet.</Text>
                <TouchableOpacity
                  onPress={() => router.push('/recipe/new')}
                  className="bg-harvest-500 rounded-xl px-6 py-3"
                >
                  <Text className="text-white font-semibold">Submit your first recipe</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text className="text-latte-600 dark:text-latte-500 text-sm">
                No liked recipes yet.
              </Text>
            )}
          </View>
        ) : (
          displayRecipes.map((recipe) => (
            <MyRecipeCard
              key={recipe.id}
              recipe={recipe}
              onNavigate={() => router.push(`/recipe/${recipe.id}`)}
              onEdit={
                tab === 'mine' && !screenshotMode
                  ? () => router.push(`/recipe/edit/${recipe.id}`)
                  : undefined
              }
              onDelete={tab === 'mine' && !screenshotMode ? handleDelete : undefined}
            />
          ))
        )}

        <View className="h-24" />
      </ScrollView>

      {/* FAB — only on Mine tab */}
      {tab === 'mine' && (
        <TouchableOpacity
          onPress={() => router.push('/recipe/new')}
          className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-harvest-500 items-center justify-center shadow-lg"
          style={{ elevation: 6 }}
        >
          <Text className="text-white text-3xl font-light">+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
