import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-ristretto-900 items-center justify-center px-8">
      <Text className="text-crema-300 text-6xl mb-4">☕</Text>
      <Text className="text-latte-100 text-2xl font-bold mb-2">Lost in the grind</Text>
      <Text className="text-latte-400 text-center mb-8">
        {`This screen doesn't exist. Maybe check your grind settings.`}
      </Text>
      <Link href="/" className="text-harvest-400 text-base">
        Back to Explore
      </Link>
    </View>
  );
}
