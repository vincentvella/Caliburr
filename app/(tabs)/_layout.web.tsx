import { Slot, router, usePathname } from 'expo-router';
import { View, Text, TouchableOpacity, Pressable, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { PlayStoreBanner } from '@/components/PlayStoreBanner';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { useUniwind } from 'uniwind';

const SIDEBAR_WIDTH = 240;
const BREAKPOINT = 1024;

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  match: (path: string) => boolean;
}[] = [
  {
    href: '/(tabs)',
    label: 'Explore',
    icon: 'compass-outline',
    match: (p) => p === '/' || p === '/(tabs)' || p === '/(tabs)/index',
  },
  {
    href: '/(tabs)/recipes',
    label: 'My Brews',
    icon: 'book-outline',
    match: (p) => p.includes('/recipes'),
  },
  {
    href: '/(tabs)/gear',
    label: 'Gear',
    icon: 'cafe-outline',
    match: (p) => p.includes('/gear'),
  },
  {
    href: '/(tabs)/profile',
    label: 'Profile',
    icon: 'person-outline',
    match: (p) => p.includes('/profile'),
  },
];

const THEME_ICONS: Record<ThemePreference, React.ComponentProps<typeof Ionicons>['name']> = {
  system: 'contrast-outline',
  light: 'sunny-outline',
  dark: 'moon-outline',
};

const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

function Sidebar({ onClose, isWide }: { onClose?: () => void; isWide: boolean }) {
  const pathname = usePathname();
  const { preference, setPreference } = useTheme();
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const iconColor = isDark ? '#c8824a' : '#b5693a';
  const activeIconColor = '#ff9d37';

  function cycleTheme() {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(preference) + 1) % THEME_CYCLE.length];
    setPreference(next);
  }

  function navigate(href: string) {
    router.push(href as Parameters<typeof router.push>[0]);
    onClose?.();
  }

  return (
    <View
      className="bg-latte-50 dark:bg-ristretto-950 border-r border-latte-200 dark:border-ristretto-800 flex-col"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* Logo */}
      <View className="px-5 pt-6 pb-4">
        <TouchableOpacity onPress={() => navigate('/(tabs)')}>
          <Text className="text-harvest-500 text-2xl font-display-bold">Caliburr</Text>
          <Text className="text-latte-500 dark:text-latte-600 text-xs mt-0.5">
            Dial in your perfect cup.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nav items */}
      <View className="px-3 gap-1 flex-1">
        {NAV_ITEMS.map(({ href, label, icon, match }) => {
          const isActive = match(pathname);
          return (
            <TouchableOpacity
              key={href}
              onPress={() => navigate(href)}
              className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl ${
                isActive ? 'bg-harvest-50 dark:bg-ristretto-800' : ''
              }`}
            >
              <Ionicons name={icon} size={18} color={isActive ? activeIconColor : iconColor} />
              <Text
                className={`text-sm font-medium ${
                  isActive ? 'text-harvest-500' : 'text-latte-700 dark:text-latte-400'
                }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* New Brew */}
        <TouchableOpacity
          onPress={() => navigate('/recipe/new')}
          className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl bg-harvest-500 mt-2"
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text className="text-white text-sm font-semibold">New Brew</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom: theme + legal */}
      <View className="px-3 pb-6 gap-1 border-t border-latte-200 dark:border-ristretto-800 pt-4">
        <TouchableOpacity
          onPress={cycleTheme}
          className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl"
          accessibilityLabel={`Theme: ${preference}. Tap to cycle.`}
        >
          <Ionicons name={THEME_ICONS[preference]} size={18} color={iconColor} />
          <Text className="text-latte-600 dark:text-latte-500 text-sm capitalize">
            {preference}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigate('/privacy')}
          className="flex-row items-center gap-3 px-3 py-2"
        >
          <Ionicons name="shield-outline" size={16} color={iconColor} />
          <Text className="text-latte-500 dark:text-latte-600 text-xs">Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigate('/terms')}
          className="flex-row items-center gap-3 px-3 py-2"
        >
          <Ionicons name="document-text-outline" size={16} color={iconColor} />
          <Text className="text-latte-500 dark:text-latte-600 text-xs">Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function WebLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINT;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  return (
    <View className="flex-1 flex-row bg-latte-50 dark:bg-ristretto-950">
      {/* Persistent sidebar on wide screens */}
      {isWide && <Sidebar isWide />}

      {/* Drawer overlay on narrow screens */}
      {!isWide && drawerOpen && (
        <>
          <Pressable
            onPress={() => setDrawerOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 20,
            }}
          />
          <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 30 }}>
            <Sidebar isWide={false} onClose={() => setDrawerOpen(false)} />
          </View>
        </>
      )}

      {/* Main content */}
      <View className="flex-1">
        {/* Android Play Store banner — narrow only */}
        {!isWide && <PlayStoreBanner />}

        {/* Top bar — narrow only */}
        {!isWide && (
          <View
            className="flex-row items-center px-4 border-b border-latte-200 dark:border-ristretto-800"
            style={{ height: 52, backgroundColor: isDark ? '#070503' : '#fdf8f2' }}
          >
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              className="w-9 h-9 items-center justify-center mr-3"
            >
              <Ionicons name="menu-outline" size={22} color={isDark ? '#c8824a' : '#b5693a'} />
            </TouchableOpacity>
            <Text className="text-harvest-500 text-lg font-display-bold flex-1">Caliburr</Text>
            <TouchableOpacity
              onPress={() => router.push('/recipe/new')}
              className="bg-harvest-500 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">+ New</Text>
            </TouchableOpacity>
          </View>
        )}

        <Slot />
      </View>
    </View>
  );
}
