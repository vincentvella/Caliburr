import { View, Text } from 'react-native';

export function StatCard({ label, value }: { label: string; value: string }) {
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
