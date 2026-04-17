import { View, Text, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUniwind } from 'uniwind';
import { useTheme, type ThemePreference } from '@/lib/theme';

const SIDEBAR_WIDTH = 240;

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

export function NativeSidebar() {
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

  return (
    <View
      className="bg-latte-50 dark:bg-ristretto-950 border-r border-latte-200 dark:border-ristretto-800 flex-col"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* Logo */}
      <View className="px-5 pt-8 pb-4">
        <TouchableOpacity onPress={() => router.push('/(tabs)')}>
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
              onPress={() => router.push(href as Parameters<typeof router.push>[0])}
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
          onPress={() => router.push('/recipe/new')}
          className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl bg-harvest-500 mt-2"
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text className="text-white text-sm font-semibold">New Brew</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom: theme + legal */}
      <View className="px-3 pb-8 gap-1 border-t border-latte-200 dark:border-ristretto-800 pt-4">
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
          onPress={() => router.push('/privacy')}
          className="flex-row items-center gap-3 px-3 py-2"
        >
          <Ionicons name="shield-outline" size={16} color={iconColor} />
          <Text className="text-latte-500 dark:text-latte-600 text-xs">Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/terms')}
          className="flex-row items-center gap-3 px-3 py-2"
        >
          <Ionicons name="document-text-outline" size={16} color={iconColor} />
          <Text className="text-latte-500 dark:text-latte-600 text-xs">Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
