import { View, Text, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

type Variant = 'compact' | 'header';

export interface AuthorRowProps {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  subtitle?: string;
  variant?: Variant;
  // When true the row navigates to /user/[id]; otherwise it's purely visual.
  pressable?: boolean;
}

function initials(name: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AuthorRow({
  userId,
  displayName,
  avatarUrl,
  subtitle,
  variant = 'compact',
  pressable = true,
}: AuthorRowProps) {
  const size = variant === 'header' ? 56 : 36;
  const ringColor = 'border-latte-200 dark:border-ristretto-700';
  const name = displayName ?? 'Anonymous';

  const Body = (
    <View className="flex-row items-center gap-3">
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          className={`bg-oat-100 dark:bg-ristretto-800 border ${ringColor}`}
        />
      ) : (
        <View
          style={{ width: size, height: size, borderRadius: size / 2 }}
          className={`bg-harvest-500/15 dark:bg-harvest-500/25 border ${ringColor} items-center justify-center`}
        >
          <Text
            className="text-harvest-700 dark:text-harvest-300 font-semibold"
            style={{ fontSize: size * 0.4 }}
          >
            {initials(displayName)}
          </Text>
        </View>
      )}
      <View className="flex-1">
        <Text
          className={
            variant === 'header'
              ? 'text-latte-950 dark:text-latte-100 font-semibold text-lg'
              : 'text-latte-950 dark:text-latte-100 font-medium text-sm'
          }
          numberOfLines={1}
        >
          {name}
        </Text>
        {subtitle ? (
          <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {pressable ? <Text className="text-latte-500 dark:text-latte-600 text-lg">›</Text> : null}
    </View>
  );

  if (!pressable) return Body;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/user/${userId}`)}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {Body}
    </TouchableOpacity>
  );
}
