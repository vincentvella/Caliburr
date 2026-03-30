import { View, Text } from "react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-ristretto-900 items-center justify-center">
      <Text className="text-latte-200 text-xl font-semibold">Profile</Text>
      <Text className="text-latte-500 text-sm mt-2">Sign in to get started.</Text>
    </View>
  );
}
