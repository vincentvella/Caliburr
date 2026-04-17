import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, useWindowDimensions } from 'react-native';
import { useUniwind } from 'uniwind';
import { NativeSidebar } from '@/components/NativeSidebar';

const BREAKPOINT = 768;

export default function TabLayout() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINT;

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {isWide && <NativeSidebar />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: isWide
            ? { display: 'none' }
            : {
                backgroundColor: isDark ? '#16100b' : '#fdf8f2',
                borderTopColor: isDark ? '#2e2017' : '#f2d9bc',
              },
          tabBarActiveTintColor: isDark ? '#ff9d37' : '#f97c0f',
          tabBarInactiveTintColor: isDark ? '#8e8eac' : '#b5693a',
        }}
        style={{ flex: 1 }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'My Brews',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
