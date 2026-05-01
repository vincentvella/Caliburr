import { View } from 'react-native';
import { Skeleton } from './Skeleton';

/**
 * Mirrors the layout of RecipeCard so the explore feed doesn't flash blank
 * before content lands. Stats and footer have placeholder pill shapes.
 */
export function RecipeCardSkeleton() {
  return (
    <View className="bg-oat-100 dark:bg-ristretto-800 rounded-2xl p-4 mb-3 border border-latte-200 dark:border-ristretto-700">
      {/* Title row */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-2 gap-2">
          <Skeleton
            className="bg-oat-200 dark:bg-ristretto-700 rounded"
            style={{ height: 16, width: '70%' }}
          />
          <Skeleton
            className="bg-oat-200 dark:bg-ristretto-700 rounded"
            style={{ height: 11, width: '50%' }}
          />
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row flex-wrap gap-x-5 gap-y-2 mt-1">
        {[60, 56, 52, 64].map((w, i) => (
          <View key={i} className="gap-1.5">
            <Skeleton
              className="bg-oat-200 dark:bg-ristretto-700 rounded"
              style={{ height: 9, width: 32 }}
            />
            <Skeleton
              className="bg-oat-200 dark:bg-ristretto-700 rounded"
              style={{ height: 14, width: w }}
            />
          </View>
        ))}
      </View>

      {/* Footer: roast pill + upvote */}
      <View className="flex-row items-center justify-between mt-4">
        <Skeleton
          className="bg-oat-200 dark:bg-ristretto-700 rounded-full"
          style={{ height: 18, width: 70 }}
        />
        <Skeleton
          className="bg-oat-200 dark:bg-ristretto-700 rounded-xl"
          style={{ height: 30, width: 60 }}
        />
      </View>
    </View>
  );
}
