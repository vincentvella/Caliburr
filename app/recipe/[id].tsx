import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  type RecipeWithJoins,
  type RecipeHistory,
  BREW_METHOD_LABELS,
  ROAST_LEVEL_LABELS,
  MACHINE_TYPE_LABELS,
} from '@/lib/types';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<RecipeWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [upvoted, setUpvoted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [history, setHistory] = useState<RecipeHistory[]>([]);

  useEffect(() => {
    async function load() {
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

      if (recipeRes.data) setRecipe(recipeRes.data as RecipeWithJoins);
      setUpvoted(!!upvoteRes.data);

      if (user && recipeRes.data?.user_id === user.id) {
        const { data: historyData } = await supabase
          .from('recipe_history')
          .select('*')
          .eq('recipe_id', id)
          .order('edited_at', { ascending: false });
        setHistory(historyData ?? []);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function toggleUpvote() {
    if (!currentUserId || !recipe) return;
    setUpvoted((v) => !v);
    setRecipe((r) => (r ? { ...r, upvotes: r.upvotes + (upvoted ? -1 : 1) } : r));

    if (upvoted) {
      await supabase
        .from('recipe_upvotes')
        .delete()
        .eq('recipe_id', recipe.id)
        .eq('user_id', currentUserId);
    } else {
      await supabase
        .from('recipe_upvotes')
        .insert({ recipe_id: recipe.id, user_id: currentUserId });
    }
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
          await supabase.from('recipes').delete().eq('id', recipe.id).eq('user_id', currentUserId!);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-ristretto-900 items-center justify-center">
        <ActivityIndicator color="#ff9d37" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 bg-ristretto-900 items-center justify-center px-8">
        <Text className="text-latte-500 text-center">Recipe not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-harvest-400 font-semibold">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = currentUserId === recipe.user_id;
  const grinderLabel = `${recipe.grinder.brand} ${recipe.grinder.model}`;

  return (
    <View className="flex-1 bg-ristretto-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-ristretto-700">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-harvest-400 font-semibold">← Back</Text>
        </TouchableOpacity>
        {isOwner && (
          <View className="flex-row items-center gap-4">
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
          </View>
        )}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-6 pb-24 gap-6">
        {/* Title */}
        <View className="gap-1">
          {recipe.bean ? (
            <>
              <Text className="text-latte-100 text-2xl font-bold">{recipe.bean.name}</Text>
              <Text className="text-latte-500 text-sm">{recipe.bean.roaster}</Text>
            </>
          ) : (
            <Text className="text-latte-100 text-2xl font-bold">{grinderLabel}</Text>
          )}
          <Text className="text-latte-500 text-sm mt-1">
            {BREW_METHOD_LABELS[recipe.brew_method]}
          </Text>
        </View>

        {/* Grind setting — hero stat */}
        <View className="bg-ristretto-800 border border-ristretto-700 rounded-2xl px-5 py-4 items-center">
          <Text className="text-latte-500 text-xs mb-1">Grind Setting</Text>
          <Text className="text-harvest-400 font-bold" style={{ fontSize: 48 }}>
            {recipe.grind_setting}
          </Text>
        </View>

        {/* Parameters */}
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

        {/* Notes */}
        {recipe.notes && (
          <View className="gap-2">
            <Text className="text-latte-400 text-xs font-semibold uppercase tracking-wider">
              Notes
            </Text>
            <Text className="text-latte-300 text-sm leading-relaxed">{recipe.notes}</Text>
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
            <Text className="text-latte-400 text-xs font-semibold uppercase tracking-wider">
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
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-ristretto-900 border-t border-ristretto-800">
        <TouchableOpacity
          onPress={toggleUpvote}
          className="flex-row items-center justify-center gap-2 rounded-2xl py-4"
          style={{ backgroundColor: upvoted ? '#7c3a1a' : '#2a1c14' }}
        >
          <Text style={{ color: upvoted ? '#ff9d37' : '#6e5a47', fontSize: 18 }}>▲</Text>
          <Text
            className="font-semibold text-base"
            style={{ color: upvoted ? '#ff9d37' : '#6e5a47' }}
          >
            {recipe.upvotes} {recipe.upvotes === 1 ? 'upvote' : 'upvotes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3 items-center"
      style={{ minWidth: 80 }}
    >
      <Text className="text-latte-600 text-xs mb-0.5">{label}</Text>
      <Text className="text-latte-100 font-semibold text-sm">{value}</Text>
    </View>
  );
}

type HistorySnapshot = Pick<
  RecipeHistory,
  | 'grind_setting'
  | 'dose_g'
  | 'yield_g'
  | 'brew_time_s'
  | 'water_temp_c'
  | 'ratio'
  | 'roast_level'
  | 'roast_date'
  | 'notes'
>;

function HistoryCard({ entry, current }: { entry: RecipeHistory; current: HistorySnapshot }) {
  const [expanded, setExpanded] = useState(false);

  const diffs: { label: string; was: string; now: string }[] = [];

  if (current.grind_setting !== entry.grind_setting)
    diffs.push({ label: 'Grind', was: entry.grind_setting, now: current.grind_setting });
  if (current.dose_g !== entry.dose_g)
    diffs.push({
      label: 'Dose',
      was: entry.dose_g != null ? `${entry.dose_g}g` : '—',
      now: current.dose_g != null ? `${current.dose_g}g` : '—',
    });
  if (current.yield_g !== entry.yield_g)
    diffs.push({
      label: 'Yield',
      was: entry.yield_g != null ? `${entry.yield_g}g` : '—',
      now: current.yield_g != null ? `${current.yield_g}g` : '—',
    });
  if (current.brew_time_s !== entry.brew_time_s)
    diffs.push({
      label: 'Brew Time',
      was: entry.brew_time_s != null ? formatTime(entry.brew_time_s) : '—',
      now: current.brew_time_s != null ? formatTime(current.brew_time_s) : '—',
    });
  if (current.water_temp_c !== entry.water_temp_c)
    diffs.push({
      label: 'Temp',
      was: entry.water_temp_c != null ? `${entry.water_temp_c}°C` : '—',
      now: current.water_temp_c != null ? `${current.water_temp_c}°C` : '—',
    });
  if (current.ratio !== entry.ratio)
    diffs.push({
      label: 'Ratio',
      was: entry.ratio != null ? `1:${entry.ratio}` : '—',
      now: current.ratio != null ? `1:${current.ratio}` : '—',
    });
  if (current.roast_level !== entry.roast_level)
    diffs.push({
      label: 'Roast',
      was: entry.roast_level ? ROAST_LEVEL_LABELS[entry.roast_level] : '—',
      now: current.roast_level ? ROAST_LEVEL_LABELS[current.roast_level] : '—',
    });
  if (current.roast_date !== entry.roast_date)
    diffs.push({
      label: 'Roast Date',
      was: entry.roast_date ?? '—',
      now: current.roast_date ?? '—',
    });
  if (current.notes !== entry.notes)
    diffs.push({ label: 'Notes', was: entry.notes ?? '—', now: current.notes ?? '—' });

  const date = new Date(entry.edited_at);
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <TouchableOpacity
      onPress={() => setExpanded((v) => !v)}
      className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3"
      activeOpacity={0.8}
    >
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <Text className="text-latte-200 text-sm font-medium">
            {dateStr} · {timeStr}
          </Text>
          <Text className="text-latte-500 text-xs">
            {diffs.length === 0
              ? 'No tracked changes'
              : `${diffs.length} field${diffs.length === 1 ? '' : 's'} changed`}
          </Text>
        </View>
        <Text className="text-latte-600 text-xs">{expanded ? '▲' : '▼'}</Text>
      </View>
      {expanded && diffs.length > 0 && (
        <View className="mt-3 gap-2">
          {diffs.map((d) => (
            <View key={d.label} className="gap-0.5">
              <Text className="text-latte-500 text-xs">{d.label}</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-latte-400 text-xs line-through">{d.was}</Text>
                <Text className="text-latte-600 text-xs">→</Text>
                <Text className="text-latte-100 text-xs font-medium">{d.now}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function EquipmentRow({
  label,
  value,
  subtitle,
  verified,
}: {
  label: string;
  value: string;
  subtitle?: string;
  verified?: boolean;
}) {
  return (
    <View className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3 flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-latte-500 text-xs">{label}</Text>
        <Text className="text-latte-100 font-medium text-sm mt-0.5">{value}</Text>
        {subtitle && <Text className="text-latte-600 text-xs mt-0.5 capitalize">{subtitle}</Text>}
      </View>
      {verified && (
        <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5 ml-3">
          <Text className="text-bloom-400 text-xs">Verified</Text>
        </View>
      )}
    </View>
  );
}
