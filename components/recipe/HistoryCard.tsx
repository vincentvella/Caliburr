import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { type RecipeHistory, ROAST_LEVEL_LABELS } from '@/lib/types';
import { formatTime } from './RecipeStats';

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

export function HistoryCard({
  entry,
  current,
}: {
  entry: RecipeHistory;
  current: HistorySnapshot;
}) {
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
      className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3"
      activeOpacity={0.8}
    >
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <Text className="text-latte-800 dark:text-latte-200 text-sm font-medium">
            {dateStr} · {timeStr}
          </Text>
          <Text className="text-latte-600 dark:text-latte-500 text-xs">
            {diffs.length === 0
              ? 'No tracked changes'
              : `${diffs.length} field${diffs.length === 1 ? '' : 's'} changed`}
          </Text>
        </View>
        <Text className="text-latte-500 dark:text-latte-600 text-xs">{expanded ? '▲' : '▼'}</Text>
      </View>
      {expanded && diffs.length > 0 && (
        <View className="mt-3 gap-2">
          {diffs.map((d) => (
            <View key={d.label} className="gap-0.5">
              <Text className="text-latte-600 dark:text-latte-500 text-xs">{d.label}</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-latte-700 dark:text-latte-400 text-xs line-through">
                  {d.was}
                </Text>
                <Text className="text-latte-500 dark:text-latte-600 text-xs">→</Text>
                <Text className="text-latte-950 dark:text-latte-100 text-xs font-medium">
                  {d.now}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
