import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { type RecipeWithJoins, BREW_METHOD_LABELS } from '@/lib/types';
import { Stat, formatTime } from '@/components/recipe/RecipeStats';

export function MyRecipeCard({
  recipe,
  onNavigate,
  onEdit,
  onDelete,
}: {
  recipe: RecipeWithJoins;
  onNavigate: () => void;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
}) {
  const grinderLabel = `${recipe.grinder.brand} ${recipe.grinder.model}`;
  const methodLabel = BREW_METHOD_LABELS[recipe.brew_method];

  function confirmDelete() {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete!(recipe.id) },
      ],
    );
  }

  return (
    <View
      testID="recipe-item"
      className="bg-oat-100 dark:bg-ristretto-800 rounded-2xl mb-3 border border-latte-200 dark:border-ristretto-700 overflow-hidden"
    >
      {/* Tappable content area */}
      <TouchableOpacity activeOpacity={0.85} onPress={onNavigate} className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1">
            {recipe.bean ? (
              <Text
                className="text-latte-950 dark:text-latte-100 text-base font-display-semibold"
                numberOfLines={1}
              >
                {recipe.bean.name}
              </Text>
            ) : (
              <Text className="text-latte-700 dark:text-latte-300 text-base font-display-semibold">
                {grinderLabel}
              </Text>
            )}
            <Text className="text-latte-600 dark:text-latte-500 text-sm mt-0.5">
              {recipe.bean ? `${grinderLabel} · ` : ''}
              {methodLabel}
            </Text>
          </View>
        </View>

        <View className="flex-row mt-3 gap-5">
          <Stat label="Grind" value={recipe.grind_setting} />
          {recipe.dose_g != null && <Stat label="Dose" value={`${recipe.dose_g}g`} />}
          {recipe.yield_g != null && <Stat label="Yield" value={`${recipe.yield_g}g`} />}
          {recipe.ratio != null && <Stat label="Ratio" value={`1:${recipe.ratio}`} />}
          {recipe.brew_time_s != null && (
            <Stat label="Time" value={formatTime(recipe.brew_time_s)} />
          )}
          {recipe.water_temp_c != null && <Stat label="Temp" value={`${recipe.water_temp_c}°C`} />}
        </View>

        {recipe.notes && (
          <Text
            className="text-latte-600 dark:text-latte-500 text-xs mt-3 leading-relaxed"
            numberOfLines={3}
          >
            {recipe.notes}
          </Text>
        )}
      </TouchableOpacity>

      {/* Action row */}
      <View className="flex-row items-center justify-between px-4 pb-3">
        <Text className="text-latte-500 dark:text-latte-600 text-xs">{recipe.upvotes} votes</Text>
        {(onEdit || onDelete) && (
          <View className="flex-row gap-4">
            {onEdit && (
              <TouchableOpacity
                onPress={onEdit}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Edit recipe"
                accessibilityRole="button"
              >
                <Text className="text-harvest-400 text-sm font-medium">Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={confirmDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Delete recipe"
                accessibilityRole="button"
              >
                <Text className="text-latte-500 dark:text-latte-600 text-lg leading-none">×</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
