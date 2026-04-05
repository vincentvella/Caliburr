import { View, Text } from 'react-native';

export function EquipmentRow({
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
    <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3 flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-latte-600 dark:text-latte-500 text-xs">{label}</Text>
        <Text className="text-latte-950 dark:text-latte-100 font-medium text-sm mt-0.5">
          {value}
        </Text>
        {subtitle && (
          <Text className="text-latte-500 dark:text-latte-600 text-xs mt-0.5 capitalize">
            {subtitle}
          </Text>
        )}
      </View>
      {verified && (
        <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-full px-2 py-0.5 ml-3">
          <Text className="text-bloom-700 dark:text-bloom-400 text-xs">Verified</Text>
        </View>
      )}
    </View>
  );
}
