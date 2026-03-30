import { View, Text } from "react-native";

export default function RecipesScreen() {
  return (
    <View className="flex-1 bg-ristretto-900 items-center justify-center">
      <Text className="text-latte-200 text-xl font-semibold">My Recipes</Text>
      <Text className="text-latte-500 text-sm mt-2">
        Your saved dials will appear here.
      </Text>
    </View>
  );
}
