import { View, Text } from 'react-native';

export function BackerBadge({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  if (size === 'lg') {
    return (
      <View className="flex-row items-center gap-2 bg-crema-900/30 border border-crema-700 rounded-2xl px-4 py-3">
        <Text style={{ fontSize: 22 }}>☕</Text>
        <View>
          <Text className="text-crema-300 font-semibold text-base">Caliburr Backer</Text>
          <Text className="text-crema-500 text-xs mt-0.5">Supporting the community database</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="self-start flex-row items-center gap-1 bg-crema-900/30 border border-crema-700 rounded-full px-2 py-0.5">
      <Text style={{ fontSize: 10 }}>☕</Text>
      <Text className="text-crema-400 text-xs font-medium">Backer</Text>
    </View>
  );
}
