import { Slot } from 'expo-router';
import { View, Text, useWindowDimensions } from 'react-native';
import { useUniwind } from 'uniwind';

export default function AuthWebLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  return (
    <View
      className="flex-1 items-center justify-center bg-latte-100 dark:bg-ristretto-950"
      style={{ backgroundColor: isDark ? '#070503' : '#f0e8dc' }}
    >
      {isWide ? (
        /* Side-by-side on wide screens */
        <View
          className="flex-row rounded-2xl overflow-hidden shadow-lg"
          style={{ width: 800, minHeight: 520 }}
        >
          {/* Brand panel */}
          <View className="bg-harvest-500 justify-center px-10" style={{ width: 320 }}>
            <Text className="text-white text-4xl font-display-bold mb-3">Caliburr</Text>
            <Text className="text-harvest-100 text-base leading-6">
              The community grind database.{'\n'}Dial in your perfect cup.
            </Text>
          </View>

          {/* Form panel */}
          <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
            <Slot />
          </View>
        </View>
      ) : (
        /* Centered card on narrow screens */
        <View
          className="bg-latte-50 dark:bg-ristretto-900 rounded-2xl overflow-hidden shadow-lg"
          style={{ width: Math.min(width - 32, 420), minHeight: 480 }}
        >
          <Slot />
        </View>
      )}
    </View>
  );
}
