import { View, Text } from 'react-native';

export function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View>
      <Text className="text-latte-500 dark:text-latte-600 text-xs">{label}</Text>
      <Text className="font-semibold text-sm" style={{ color: highlight ? '#ff9d37' : '#c8b09a' }}>
        {value}
      </Text>
    </View>
  );
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
