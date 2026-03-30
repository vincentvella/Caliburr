import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  type RecipeWithJoins,
  BREW_METHOD_LABELS,
} from "@/lib/types";

function RecipeCard({ recipe }: { recipe: RecipeWithJoins }) {
  const grinderLabel = `${recipe.grinder.brand} ${recipe.grinder.model}`;
  const methodLabel = BREW_METHOD_LABELS[recipe.brew_method];

  return (
    <View className="bg-ristretto-800 rounded-2xl p-4 mb-3 border border-ristretto-700">
      <View className="flex-row items-start justify-between mb-1">
        <View className="flex-1">
          {recipe.bean ? (
            <Text className="text-latte-100 font-semibold text-base" numberOfLines={1}>
              {recipe.bean.name}
            </Text>
          ) : (
            <Text className="text-latte-300 font-semibold text-base">{grinderLabel}</Text>
          )}
          <Text className="text-latte-500 text-sm mt-0.5">
            {recipe.bean ? `${grinderLabel} · ` : ''}{methodLabel}
          </Text>
        </View>
        {recipe.grinder.verified && (
          <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5 ml-2">
            <Text className="text-bloom-400 text-xs font-medium">Verified</Text>
          </View>
        )}
      </View>

      <View className="flex-row mt-3 gap-5">
        <Stat label="Grind" value={recipe.grind_setting} />
        {recipe.dose_g != null && (
          <Stat label="Dose" value={`${recipe.dose_g}g`} />
        )}
        {recipe.yield_g != null && (
          <Stat label="Yield" value={`${recipe.yield_g}g`} />
        )}
        {recipe.ratio != null && (
          <Stat label="Ratio" value={`1:${recipe.ratio}`} />
        )}
        {recipe.brew_time_s != null && (
          <Stat label="Time" value={formatTime(recipe.brew_time_s)} />
        )}
      </View>

      {recipe.notes && (
        <Text className="text-latte-500 text-xs mt-3 leading-relaxed" numberOfLines={2}>
          {recipe.notes}
        </Text>
      )}

      <View className="flex-row justify-end mt-3">
        <Text className="text-latte-600 text-xs">{recipe.upvotes} votes</Text>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-latte-500 text-xs">{label}</Text>
      <Text className="text-harvest-400 font-semibold text-sm">{value}</Text>
    </View>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ExploreScreen() {
  const [recipes, setRecipes] = useState<RecipeWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        grinder:grinders(brand, model, verified),
        bean:beans(name, roaster)
      `)
      .order("upvotes", { ascending: false })
      .limit(50);

    if (error) {
      setError(error.message);
    } else {
      setRecipes(data as RecipeWithJoins[]);
    }
  }, []);

  useEffect(() => {
    fetchRecipes().finally(() => setLoading(false));
  }, [fetchRecipes]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecipes();
    setRefreshing(false);
  }, [fetchRecipes]);

  return (
    <View className="flex-1 bg-ristretto-900">
      <ScrollView
        className="flex-1 px-4 pt-16"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#ff9d37"
          />
        }
      >
        <Text className="text-crema-300 text-3xl font-bold mb-1">Caliburr</Text>
        <Text className="text-latte-400 text-base mb-8">
          Dial in your perfect cup.
        </Text>

        <Text className="text-latte-200 text-xl font-semibold mb-4">
          Popular Recipes
        </Text>

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#ff9d37" />
          </View>
        ) : error ? (
          <View className="items-center py-12">
            <Text className="text-latte-500 text-sm">{error}</Text>
          </View>
        ) : recipes.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-latte-500 text-sm">No recipes yet. Be the first to submit one.</Text>
          </View>
        ) : (
          recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
