import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, useWindowDimensions } from 'react-native';
import { useUniwind } from 'uniwind';
import { NativeSidebar } from '@/components/NativeSidebar';
import { useScreenshotMode } from '@/lib/useScreenshotMode';

const BREAKPOINT = 768;

export default function TabLayout() {
  // Side-effect: latches the sticky `?screenshot=1` flag on any tab landing
  // so deep children (grinder/[id], etc.) see screenshot mode even after
  // navigating away from the URL that set the param.
  useScreenshotMode();

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
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Explore',
            tabBarButtonTestID: 'nav-explore',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'My Brews',
            tabBarButtonTestID: 'nav-my-brews',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="brew"
          options={{
            title: 'Brew',
            tabBarButtonTestID: 'nav-brew',
            tabBarLabel: () => null,
            tabBarIcon: ({ size }) => (
              <View
                style={{
                  backgroundColor: '#ff9d37',
                  borderRadius: 999,
                  width: size + 20,
                  height: size + 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 8,
                }}
              >
                <Ionicons name="add" size={size + 4} color="#fff" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.push('/recipe/new');
            },
          }}
        />
        <Tabs.Screen
          name="gear"
          options={{
            title: 'Gear',
            tabBarButtonTestID: 'nav-gear',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cafe-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarButtonTestID: 'nav-profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
