import { Stack } from 'expo-router';
import { View, Text, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { useUniwind } from 'uniwind';

const BREAKPOINT = 768;

function AuthShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINT;
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  if (!isWide) return <>{children}</>;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: isDark ? '#070503' : '#f0e8dc' }}
    >
      <View
        className="flex-row rounded-2xl overflow-hidden"
        style={{
          width: 800,
          minHeight: 520,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 8,
        }}
      >
        {/* Brand panel */}
        <View className="bg-harvest-500 justify-center px-10" style={{ width: 320 }}>
          <Text className="text-white text-4xl font-display-bold mb-3">Caliburr</Text>
          <Text className="text-harvest-100 text-base leading-6">
            The community grind database.{'\n'}Dial in your perfect cup.
          </Text>
        </View>

        {/* Form panel */}
        <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">{children}</View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function AuthLayout() {
  return (
    <AuthShell>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </AuthShell>
  );
}
