import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUniwind } from 'uniwind';

export default function TabLayout() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#16100b' : '#fdf8f2',
          borderTopColor: isDark ? '#2e2017' : '#f2d9bc',
        },
        tabBarActiveTintColor: isDark ? '#ff9d37' : '#f97c0f',
        tabBarInactiveTintColor: isDark ? '#8e8eac' : '#b5693a',
      }}
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
          title: 'My Recipes',
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
  );
}
