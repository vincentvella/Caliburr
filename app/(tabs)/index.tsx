import { View, Text, ScrollView } from "react-native";

export default function ExploreScreen() {
  return (
    <View className="flex-1 bg-ristretto-900">
      <ScrollView className="flex-1 px-4 pt-16">
        <Text className="text-crema-300 text-3xl font-bold mb-1">Caliburr</Text>
        <Text className="text-latte-400 text-base mb-8">
          Dial in your perfect cup.
        </Text>
        <Text className="text-latte-200 text-xl font-semibold mb-4">
          Popular Recipes
        </Text>
        {/* Recipe cards go here */}
        <View className="bg-ristretto-800 rounded-2xl p-4 mb-3 border border-ristretto-700">
          <Text className="text-latte-100 font-semibold text-base">
            Ethiopia Yirgacheffe
          </Text>
          <Text className="text-latte-400 text-sm mt-1">
            Niche Zero · Pour Over
          </Text>
          <View className="flex-row mt-3 gap-4">
            <View>
              <Text className="text-latte-500 text-xs">Grind</Text>
              <Text className="text-harvest-400 font-semibold">3.2</Text>
            </View>
            <View>
              <Text className="text-latte-500 text-xs">Dose</Text>
              <Text className="text-harvest-400 font-semibold">15g</Text>
            </View>
            <View>
              <Text className="text-latte-500 text-xs">Ratio</Text>
              <Text className="text-harvest-400 font-semibold">1:16</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
