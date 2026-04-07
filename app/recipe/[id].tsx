import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import {
  type RecipeWithJoins,
  type RecipeHistory,
  BREW_METHOD_LABELS,
  ROAST_LEVEL_LABELS,
  MACHINE_TYPE_LABELS,
} from '@/lib/types';
import { StatCard } from '@/components/recipe/StatCard';
import { HistoryCard } from '@/components/recipe/HistoryCard';
import { EquipmentRow } from '@/components/recipe/EquipmentRow';
import { formatTime } from '@/components/recipe/RecipeStats';

function useRecipeScreen(id: string) {
  const [recipe, setRecipe] = useState<RecipeWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [upvoted, setUpvoted] = useState(false);
  const [history, setHistory] = useState<RecipeHistory[]>([]);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);

        const [recipeRes, upvoteRes] = await Promise.all([
          supabase
            .from('recipes')
            .select(
              `
                *,
                grinder:grinders(brand, model, verified, burr_type, adjustment_type),
                bean:beans(name, roaster, origin, process, roast_level),
                brew_machine:brew_machines(brand, model, machine_type, verified)
              `,
            )
            .eq('id', id)
            .single(),
          user
            ? supabase
                .from('recipe_upvotes')
                .select('recipe_id')
                .eq('recipe_id', id)
                .eq('user_id', user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (recipeRes.error) throw new Error(recipeRes.error.message);
        setRecipe(recipeRes.data as RecipeWithJoins);
        setUpvoted(!!upvoteRes.data);

        if (user && recipeRes.data?.user_id === user.id) {
          const { data: historyData } = await supabase
            .from('recipe_history')
            .select('*')
            .eq('recipe_id', id)
            .order('edited_at', { ascending: false });
          setHistory(historyData ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return { recipe, setRecipe, loading, error, currentUserId, upvoted, setUpvoted, history };
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipe, setRecipe, loading, error, currentUserId, upvoted, setUpvoted, history } =
    useRecipeScreen(id);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggleUpvote() {
    if (!currentUserId || !recipe) return;
    setUpvoted((v) => !v);
    setRecipe((r) => (r ? { ...r, upvotes: r.upvotes + (upvoted ? -1 : 1) } : r));

    if (upvoted) {
      const { error: err } = await supabase
        .from('recipe_upvotes')
        .delete()
        .eq('recipe_id', recipe.id)
        .eq('user_id', currentUserId);
      if (err) {
        setUpvoted(true);
        setRecipe((r) => (r ? { ...r, upvotes: r.upvotes + 1 } : r));
        Alert.alert('Error', 'Failed to remove upvote. Please try again.');
      }
    } else {
      const { error: err } = await supabase
        .from('recipe_upvotes')
        .insert({ recipe_id: recipe.id, user_id: currentUserId });
      if (err) {
        setUpvoted(false);
        setRecipe((r) => (r ? { ...r, upvotes: r.upvotes - 1 } : r));
        Alert.alert('Error', 'Failed to upvote. Please try again.');
      }
    }
  }

  async function handleShare() {
    if (!recipe) return;
    const title = recipe.bean
      ? `${recipe.bean.name} — ${recipe.bean.roaster}`
      : `${recipe.grinder.brand} ${recipe.grinder.model}`;
    const lines = [
      title,
      `Brew: ${BREW_METHOD_LABELS[recipe.brew_method]}`,
      `Grinder: ${recipe.grinder.brand} ${recipe.grinder.model}`,
      `Grind: ${recipe.grind_setting}`,
      recipe.dose_g != null ? `Dose: ${recipe.dose_g}g` : null,
      recipe.yield_g != null ? `Yield: ${recipe.yield_g}g` : null,
      recipe.ratio != null ? `Ratio: 1:${recipe.ratio}` : null,
      recipe.brew_time_s != null ? `Time: ${formatTime(recipe.brew_time_s)}` : null,
      recipe.water_temp_c != null ? `Temp: ${recipe.water_temp_c}°C` : null,
      recipe.notes ? `\nNotes: ${recipe.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    await Share.share({ message: lines });
  }

  async function handleCopy() {
    if (!recipe) return;
    const params = [
      `Grind: ${recipe.grind_setting}`,
      recipe.dose_g != null ? `Dose: ${recipe.dose_g}g` : null,
      recipe.yield_g != null ? `Yield: ${recipe.yield_g}g` : null,
      recipe.ratio != null ? `Ratio: 1:${recipe.ratio}` : null,
      recipe.brew_time_s != null ? `Time: ${formatTime(recipe.brew_time_s)}` : null,
      recipe.water_temp_c != null ? `Temp: ${recipe.water_temp_c}°C` : null,
    ]
      .filter(Boolean)
      .join(' | ');
    await Clipboard.setStringAsync(params);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!recipe) return;
    Alert.alert('Delete Recipe', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const { error } = await supabase
            .from('recipes')
            .delete()
            .eq('id', recipe.id)
            .eq('user_id', currentUserId!);
          if (error) {
            setDeleting(false);
            Alert.alert('Error', 'Failed to delete recipe. Please try again.');
          } else {
            router.back();
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-latte-50 dark:bg-ristretto-900 items-center justify-center">
        <ActivityIndicator color="#ff9d37" />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View className="flex-1 bg-latte-50 dark:bg-ristretto-900 items-center justify-center px-8">
        <Text className="text-latte-600 dark:text-latte-500 text-center">
          {error ?? 'Recipe not found.'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-harvest-400 font-semibold">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = currentUserId === recipe.user_id;
  const grinderLabel = `${recipe.grinder.brand} ${recipe.grinder.model}`;

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-harvest-400 font-semibold">← Back</Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={handleShare}>
            <Text className="text-latte-700 dark:text-latte-400 font-semibold">Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/recipe/new?templateId=${recipe.id}`)}>
            <Text className="text-latte-700 dark:text-latte-400 font-semibold">Clone</Text>
          </TouchableOpacity>
          {isOwner && (
            <>
              <TouchableOpacity onPress={() => router.push(`/recipe/edit/${recipe.id}`)}>
                <Text className="text-harvest-400 font-semibold">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator size="small" color="#f87171" />
                ) : (
                  <Text className="text-red-400 font-semibold">Delete</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-6 pb-24 gap-6">
        {/* Title */}
        <View className="gap-1">
          {recipe.bean ? (
            <>
              <Text className="text-latte-950 dark:text-latte-100 text-2xl font-display-bold">
                {recipe.bean.name}
              </Text>
              <Text className="text-latte-600 dark:text-latte-500 text-sm">
                {recipe.bean.roaster}
              </Text>
            </>
          ) : (
            <Text className="text-latte-950 dark:text-latte-100 text-2xl font-display-bold">
              {grinderLabel}
            </Text>
          )}
          <Text className="text-latte-600 dark:text-latte-500 text-sm mt-1">
            {BREW_METHOD_LABELS[recipe.brew_method]}
          </Text>
        </View>

        {/* Grind setting — hero stat */}
        <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-5 py-4 items-center">
          <Text className="text-latte-600 dark:text-latte-500 text-xs mb-1">Grind Setting</Text>
          <Text className="text-harvest-400 font-bold" style={{ fontSize: 48 }}>
            {recipe.grind_setting}
          </Text>
        </View>

        {/* Parameters */}
        <View className="gap-3">
          <TouchableOpacity onPress={handleCopy} className="self-end">
            <Text className="text-xs font-medium" style={{ color: copied ? '#4ade80' : '#6e5a47' }}>
              {copied ? 'Copied!' : 'Copy params'}
            </Text>
          </TouchableOpacity>
          <View className="flex-row flex-wrap gap-3">
            {recipe.dose_g != null && <StatCard label="Dose" value={`${recipe.dose_g}g`} />}
            {recipe.yield_g != null && <StatCard label="Yield" value={`${recipe.yield_g}g`} />}
            {recipe.ratio != null && <StatCard label="Ratio" value={`1:${recipe.ratio}`} />}
            {recipe.brew_time_s != null && (
              <StatCard label="Brew Time" value={formatTime(recipe.brew_time_s)} />
            )}
            {recipe.water_temp_c != null && (
              <StatCard label="Temp" value={`${recipe.water_temp_c}°C`} />
            )}
            {(recipe.roast_level ?? recipe.bean?.roast_level) && (
              <StatCard
                label="Roast"
                value={ROAST_LEVEL_LABELS[(recipe.roast_level ?? recipe.bean!.roast_level)!]}
              />
            )}
            {recipe.roast_date && <StatCard label="Roast Date" value={recipe.roast_date} />}
          </View>
        </View>

        {/* Notes */}
        {recipe.notes && (
          <View className="gap-2">
            <Text className="text-latte-700 dark:text-latte-400 text-xs font-semibold uppercase tracking-wider">
              Notes
            </Text>
            <Text className="text-latte-700 dark:text-latte-300 text-sm leading-relaxed">
              {recipe.notes}
            </Text>
          </View>
        )}

        {/* Equipment */}
        <View className="gap-2">
          <Text className="text-latte-400 text-xs font-semibold uppercase tracking-wider">
            Equipment
          </Text>
          <EquipmentRow
            label="Grinder"
            value={grinderLabel}
            subtitle={
              recipe.grinder.burr_type && recipe.grinder.adjustment_type
                ? `${recipe.grinder.burr_type} · ${recipe.grinder.adjustment_type}`
                : undefined
            }
            verified={recipe.grinder.verified}
          />
          {recipe.brew_machine && (
            <EquipmentRow
              label="Machine"
              value={`${recipe.brew_machine.brand} ${recipe.brew_machine.model}`}
              subtitle={MACHINE_TYPE_LABELS[recipe.brew_machine.machine_type]}
              verified={recipe.brew_machine.verified}
            />
          )}
          {recipe.bean && (
            <EquipmentRow
              label="Bean"
              value={recipe.bean.name}
              subtitle={
                [recipe.bean.origin, recipe.bean.process].filter(Boolean).join(' · ') || undefined
              }
            />
          )}
        </View>

        {/* Edit History — owner only */}
        {isOwner && history.length > 0 && (
          <View className="gap-2">
            <Text className="text-latte-700 dark:text-latte-400 text-xs font-semibold uppercase tracking-wider">
              Edit History
            </Text>
            {history.map((entry, i) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                current={i === 0 ? recipe : history[i - 1]}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Upvote bar */}
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-latte-50 dark:bg-ristretto-900 border-t border-latte-200 dark:border-ristretto-800">
        <TouchableOpacity
          onPress={toggleUpvote}
          accessibilityLabel={`${recipe.upvotes} ${recipe.upvotes === 1 ? 'upvote' : 'upvotes'}. ${upvoted ? 'Remove upvote' : 'Upvote'}`}
          accessibilityRole="button"
          className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 border ${
            upvoted
              ? 'bg-harvest-500 border-harvest-500'
              : 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700'
          }`}
        >
          <Text
            className={`text-lg ${upvoted ? 'text-white' : 'text-latte-600 dark:text-latte-500'}`}
          >
            ▲
          </Text>
          <Text
            className={`font-semibold text-base ${upvoted ? 'text-white' : 'text-latte-600 dark:text-latte-500'}`}
          >
            {recipe.upvotes} {recipe.upvotes === 1 ? 'upvote' : 'upvotes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
