import { View, Text } from 'react-native';

export function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-latte-600 dark:text-latte-500 text-sm">{label}</Text>
      <Text className="text-latte-950 dark:text-latte-100 text-sm font-medium">{value}</Text>
    </View>
  );
}
