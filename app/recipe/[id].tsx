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
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { haptics } from '@/lib/haptics';
import { promptReport } from '@/lib/report';
import {
  type RecipeWithJoins,
  type RecipeHistory,
  type RecipeTry,
  BREW_METHOD_LABELS,
  ROAST_LEVEL_LABELS,
  MACHINE_TYPE_LABELS,
} from '@/lib/types';
import { StatCard } from '@/components/recipe/StatCard';
import { HistoryCard } from '@/components/recipe/HistoryCard';
import { EquipmentRow } from '@/components/recipe/EquipmentRow';
import { formatTime } from '@/components/recipe/RecipeStats';
import { AuthorRow } from '@/components/AuthorRow';
import { TriedThisModal } from '@/components/recipe/TriedThisModal';

interface AuthorProfile {
  display_name: string | null;
  avatar_url: string | null;
}

interface TryWithAuthor extends RecipeTry {
  profile: AuthorProfile | null;
}

function useRecipeScreen(id: string) {
  const [recipe, setRecipe] = useState<RecipeWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [upvoted, setUpvoted] = useState(false);
  const [history, setHistory] = useState<RecipeHistory[]>([]);
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [tries, setTries] = useState<TryWithAuthor[]>([]);
  const [myTry, setMyTry] = useState<RecipeTry | null>(null);
  const [myProfile, setMyProfile] = useState<AuthorProfile | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);

        const [recipeRes, upvoteRes, triesRes] = await Promise.all([
          supabase
            .from('recipes')
            .select(
              `
                *,
                grinder:grinders(brand, model, verified, burr_type, adjustment_type),
                bean:beans(name, roaster, origin, process, roast_level, tasting_notes),
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
          db
            .from('recipe_tries')
            .select('*')
            .eq('recipe_id', id)
            .order('created_at', { ascending: false }),
        ]);

        if (recipeRes.error) throw new Error(recipeRes.error.message);
        setRecipe(recipeRes.data as RecipeWithJoins);
        setUpvoted(!!upvoteRes.data);

        // Fetch author + try authors profiles in one round-trip.
        const tryRows = (triesRes.data ?? []) as RecipeTry[];
        const profileIds = Array.from(
          new Set(
            [recipeRes.data!.user_id, user?.id, ...tryRows.map((t) => t.user_id)].filter(
              (v): v is string => Boolean(v),
            ),
          ),
        );
        const profilesMap = new Map<string, AuthorProfile>();
        if (profileIds.length > 0) {
          const { data: profilesData } = await db
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', profileIds);
          for (const p of profilesData ?? []) {
            profilesMap.set(p.user_id, {
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            });
          }
        }

        const recipeAuthorId = recipeRes.data!.user_id;
        setAuthor(recipeAuthorId ? (profilesMap.get(recipeAuthorId) ?? null) : null);
        setMyProfile(user ? (profilesMap.get(user.id) ?? null) : null);
        setTries(
          tryRows.map((t) => ({
            ...t,
            profile: profilesMap.get(t.user_id) ?? null,
          })),
        );
        setMyTry(user ? (tryRows.find((t) => t.user_id === user.id) ?? null) : null);

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

  return {
    recipe,
    setRecipe,
    loading,
    error,
    currentUserId,
    upvoted,
    setUpvoted,
    history,
    author,
    tries,
    setTries,
    myTry,
    setMyTry,
    myProfile,
  };
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    recipe,
    setRecipe,
    loading,
    error,
    currentUserId,
    upvoted,
    setUpvoted,
    history,
    author,
    tries,
    setTries,
    myTry,
    setMyTry,
    myProfile,
  } = useRecipeScreen(id);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tryModalOpen, setTryModalOpen] = useState(false);

  async function toggleUpvote() {
    if (!currentUserId || !recipe) return;
    haptics.medium();
    setUpvoted((v) => !v);
    setRecipe((r) => (r ? { ...r, upvotes: r.upvotes + (upvoted ? -1 : 1) } : r));

    if (upvoted) {
      const { error: err } = await supabase
        .from('recipe_upvotes')
        .delete()
        .eq('recipe_id', recipe.id)
        .eq('user_id', currentUserId);
      if (err) {
        Sentry.captureException(err, {
          tags: { feature: 'upvote', stage: 'remove', surface: 'recipe-detail' },
          extra: { recipeId: recipe.id, userId: currentUserId },
        });
        haptics.error();
        setUpvoted(true);
        setRecipe((r) => (r ? { ...r, upvotes: r.upvotes + 1 } : r));
        Alert.alert('Error', 'Failed to remove upvote. Please try again.');
      }
    } else {
      const { error: err } = await supabase
        .from('recipe_upvotes')
        .insert({ recipe_id: recipe.id, user_id: currentUserId });
      if (err) {
        Sentry.captureException(err, {
          tags: { feature: 'upvote', stage: 'add', surface: 'recipe-detail' },
          extra: { recipeId: recipe.id, userId: currentUserId },
        });
        haptics.error();
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
    if (!recipe || !currentUserId) return;
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
            .eq('user_id', currentUserId);
          if (error) {
            Sentry.captureException(error, {
              tags: { feature: 'recipe-delete' },
              extra: { recipeId: recipe.id, userId: currentUserId },
            });
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

        {/* Author */}
        {!isOwner && recipe.user_id && (
          <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3">
            <AuthorRow
              userId={recipe.user_id}
              displayName={author?.display_name ?? null}
              avatarUrl={author?.avatar_url ?? null}
              subtitle="Recipe by"
            />
          </View>
        )}

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
            {(() => {
              const roastLevel = recipe.roast_level ?? recipe.bean?.roast_level;
              return roastLevel ? (
                <StatCard label="Roast" value={ROAST_LEVEL_LABELS[roastLevel]} />
              ) : null;
            })()}
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
            onPress={() => router.push(`/grinder/${recipe.grinder_id}`)}
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
              onPress={recipe.bean_id ? () => router.push(`/bean/${recipe.bean_id}`) : undefined}
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

        {/* Tries — community try feedback */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-latte-700 dark:text-latte-400 text-xs font-semibold uppercase tracking-wider">
              {tries.length === 0
                ? 'Tries'
                : `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`}
            </Text>
            {!isOwner && currentUserId && (
              <TouchableOpacity onPress={() => setTryModalOpen(true)}>
                <Text className="text-harvest-400 text-sm font-semibold">
                  {myTry ? 'Edit my try' : 'I tried this'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {tries.length === 0 ? (
            <Text className="text-latte-500 dark:text-latte-600 text-sm">
              No one&apos;s tried this yet. Be the first.
            </Text>
          ) : (
            tries.map((t) => {
              const deltas = [
                t.grind_delta ? `Grind: ${t.grind_delta}` : null,
                t.yield_delta_g != null ? `Yield: ${t.yield_delta_g > 0 ? '+' : ''}${t.yield_delta_g}g` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <View
                  key={t.id}
                  className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3"
                >
                  <View className="flex-row items-center gap-3 mb-1">
                    <Text className={t.worked ? 'text-bloom-500' : 'text-red-400'}>
                      {t.worked ? '👍' : '👎'}
                    </Text>
                    <Text
                      className="text-latte-950 dark:text-latte-100 text-sm font-medium flex-1"
                      numberOfLines={1}
                    >
                      {t.profile?.display_name ?? 'Anonymous'}
                    </Text>
                  </View>
                  {deltas ? (
                    <Text className="text-latte-600 dark:text-latte-500 text-xs">{deltas}</Text>
                  ) : null}
                  {t.notes ? (
                    <Text className="text-latte-700 dark:text-latte-300 text-sm mt-1">
                      {t.notes}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {!isOwner && (
          <TouchableOpacity
            onPress={() => promptReport('recipe', recipe.id)}
            className="items-center py-4 mb-4"
          >
            <Text className="text-latte-400 dark:text-latte-700 text-xs">Report this brew</Text>
          </TouchableOpacity>
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

      <TriedThisModal
        visible={tryModalOpen}
        onClose={() => setTryModalOpen(false)}
        recipeId={recipe.id}
        existing={myTry}
        onSaved={(saved) => {
          setMyTry(saved);
          setTries((prev) => {
            const others = prev.filter((t) => t.id !== saved.id);
            return [{ ...saved, profile: myProfile }, ...others];
          });
        }}
      />
    </View>
  );
}
