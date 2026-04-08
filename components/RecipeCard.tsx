import { View, Text, TouchableOpacity } from 'react-native';
import { type RecipeWithJoins, BREW_METHOD_LABELS } from '@/lib/types';
import { Stat, formatTime } from '@/components/recipe/RecipeStats';
import { BackerBadge } from '@/components/BackerBadge';

export function RecipeCard({
  recipe,
  upvoted,
  onUpvote,
  isAuthorBacker = false,
}: {
  recipe: RecipeWithJoins;
  upvoted: boolean;
  onUpvote: () => void;
  isAuthorBacker?: boolean;
}) {
  const grinderLabel = `${recipe.grinder.brand} ${recipe.grinder.model}`;
  const methodLabel = BREW_METHOD_LABELS[recipe.brew_method];

  return (
    <View
      className={`bg-oat-100 dark:bg-ristretto-800 rounded-2xl p-4 mb-3 border ${
        isAuthorBacker
          ? 'border-crema-600 dark:border-crema-700'
          : 'border-latte-200 dark:border-ristretto-700'
      }`}
    >
      {/* Title row */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          {recipe.bean ? (
            <Text
              className="text-latte-950 dark:text-latte-100 text-base font-display-semibold"
              numberOfLines={1}
            >
              {recipe.bean.name}
              {recipe.bean.roaster ? (
                <Text className="text-latte-600 dark:text-latte-500 text-sm font-sans">
                  {' '}
                  · {recipe.bean.roaster}
                </Text>
              ) : null}
            </Text>
          ) : (
            <Text
              className="text-latte-950 dark:text-latte-100 text-base font-display-semibold"
              numberOfLines={1}
            >
              {grinderLabel}
            </Text>
          )}
          <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5">
            {recipe.bean ? `${grinderLabel} · ` : ''}
            {methodLabel}
            {recipe.brew_machine
              ? ` · ${recipe.brew_machine.brand} ${recipe.brew_machine.model}`
              : ''}
          </Text>
        </View>
        {recipe.grinder.verified && (
          <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-full px-2 py-0.5">
            <Text className="text-bloom-700 dark:text-bloom-400 text-xs font-medium">Verified</Text>
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
        <Text
          className="text-latte-600 dark:text-latte-500 text-xs mt-3 leading-relaxed"
          numberOfLines={2}
        >
          {recipe.notes}
        </Text>
      ) : null}

      {/* Footer: roast level + backer badge + upvote */}
      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-row gap-2 flex-1 mr-2 flex-wrap">
          {isAuthorBacker && <BackerBadge size="sm" />}
          {recipe.roast_level ? (
            <View className="bg-oat-200 dark:bg-ristretto-700 rounded-full px-2 py-0.5">
              <Text className="text-latte-600 dark:text-latte-500 text-xs capitalize">
                {recipe.roast_level.replace('_', ' ')}
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onUpvote}
          accessibilityLabel={`${recipe.upvotes} upvote${recipe.upvotes !== 1 ? 's' : ''}. ${upvoted ? 'Remove upvote' : 'Upvote'}`}
          accessibilityRole="button"
          className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
            upvoted
              ? 'bg-harvest-500 border-harvest-500'
              : 'bg-oat-200 dark:bg-ristretto-700 border-latte-300 dark:border-ristretto-600'
          }`}
        >
          <Text
            className={`text-sm ${upvoted ? 'text-white' : 'text-latte-600 dark:text-latte-500'}`}
          >
            ▲
          </Text>
          <Text
            className={`text-xs font-semibold ${upvoted ? 'text-white' : 'text-latte-600 dark:text-latte-500'}`}
          >
            {recipe.upvotes}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
