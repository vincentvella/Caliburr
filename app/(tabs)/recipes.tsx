import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import {
  type RecipeWithJoins,
  BREW_METHOD_LABELS,
} from "@/lib/types";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-latte-500 text-xs">{label}</Text>
      <Text className="text-harvest-400 font-semibold text-sm">{value}</Text>
    </View>
  );
}

function RecipeCard({
  recipe,
  onDelete,
}: {
  recipe: RecipeWithJoins;
  onDelete: (id: string) => void;
}) {
  const grinderLabel = `${recipe.grinder.brand} ${recipe.grinder.model}`;
  const methodLabel = BREW_METHOD_LABELS[recipe.brew_method];

  function confirmDelete() {
    Alert.alert(
      "Delete Recipe",
      "Are you sure you want to delete this recipe? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(recipe.id) },
      ]
    );
  }

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
            {recipe.bean ? `${grinderLabel} · ` : ""}{methodLabel}
          </Text>
        </View>
        <TouchableOpacity onPress={confirmDelete} className="ml-3 p-1">
          <Text className="text-latte-600 text-lg">×</Text>
        </TouchableOpacity>
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
        {recipe.water_temp_c != null && (
          <Stat label="Temp" value={`${recipe.water_temp_c}°C`} />
        )}
      </View>

      {recipe.notes && (
        <Text className="text-latte-500 text-xs mt-3 leading-relaxed" numberOfLines={3}>
          {recipe.notes}
        </Text>
      )}

      <View className="flex-row justify-end mt-3">
        <Text className="text-latte-600 text-xs">{recipe.upvotes} votes</Text>
      </View>
    </View>
  );
}

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<RecipeWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        grinder:grinders(brand, model, verified),
        bean:beans(name, roaster)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRecipes(data as RecipeWithJoins[]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRecipes().finally(() => setLoading(false));
    }, [fetchRecipes])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecipes();
    setRefreshing(false);
  }, [fetchRecipes]);

  async function handleDelete(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
  }

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
        <Text className="text-latte-100 text-2xl font-bold mb-1">My Recipes</Text>
        <Text className="text-latte-500 text-sm mb-8">Your submitted dials.</Text>

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#ff9d37" />
          </View>
        ) : error ? (
          <View className="items-center py-12">
            <Text className="text-latte-500 text-sm">{error}</Text>
          </View>
        ) : recipes.length === 0 ? (
          <View className="items-center py-12 gap-3">
            <Text className="text-latte-500 text-sm">No recipes yet.</Text>
            <TouchableOpacity
              onPress={() => router.push("/recipe/new")}
              className="bg-harvest-500 rounded-xl px-6 py-3"
            >
              <Text className="text-white font-semibold">Submit your first recipe</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onDelete={handleDelete} />
          ))
        )}

        <View className="h-24" />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/recipe/new")}
        className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-harvest-500 items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
}
