import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { BackerBadge } from '@/components/BackerBadge';
import { Stat } from '@/components/recipe/RecipeStats';

/**
 * Debug screen used only for App Store screenshot capture.
 * Accessible via deep link: caliburr://screenshot/backer-badge
 * Navigate here with Maestro using openLink.
 */
export default function BackerBadgeScreenshot() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-ristretto-950 items-center justify-center px-6">
        {/* Brew card with backer badge */}
        <View className="w-full bg-ristretto-800 rounded-2xl p-4 border border-crema-700">
          {/* Title row */}
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-latte-100 text-base font-display-semibold">
                Ethiopia Yirgacheffe
                <Text className="text-latte-500 text-sm font-sans"> · Blue Bottle</Text>
              </Text>
              <Text className="text-latte-500 text-xs mt-0.5">Comandante C40 · Espresso</Text>
            </View>
            <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5">
              <Text className="text-bloom-400 text-xs font-medium">Verified</Text>
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row flex-wrap gap-x-5 gap-y-2 mt-1">
            <Stat label="Grind" value="18.5" highlight />
            <Stat label="Dose" value="18g" />
            <Stat label="Yield" value="36g" />
            <Stat label="Ratio" value="1:2" />
            <Stat label="Time" value="0:28" />
            <Stat label="Temp" value="93°C" />
          </View>

          {/* Notes */}
          <Text className="text-latte-500 text-xs mt-3 leading-relaxed">
            Bright and clean with jasmine florals. Dialled in over 3 shots — this is the sweet spot.
          </Text>

          {/* Footer */}
          <View className="flex-row items-center justify-between mt-3">
            <View className="flex-row gap-2 flex-1 mr-2 flex-wrap">
              <BackerBadge size="sm" />
              <View className="bg-ristretto-700 rounded-full px-2 py-0.5">
                <Text className="text-latte-500 text-xs capitalize">light roast</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-harvest-500 border-harvest-500">
              <Text className="text-white text-sm">▲</Text>
              <Text className="text-white text-xs font-semibold">42</Text>
            </View>
          </View>
        </View>

        {/* Label below card */}
        <View className="mt-6 items-center gap-1">
          <BackerBadge size="lg" />
          <Text className="text-latte-600 text-xs mt-3 text-center">
            Support the community. Get your badge on every brew.
          </Text>
        </View>
      </View>
    </>
  );
}
