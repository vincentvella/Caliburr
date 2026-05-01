import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LegendList } from '@legendapp/list';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { useQuery } from '@/hooks/useQuery';
import { BREW_METHOD_LABELS } from '@/lib/types';
import { AuthorRow } from '@/components/AuthorRow';

interface UserBrew {
  id: string;
  brew_method: string;
  grind_setting: string;
  upvotes: number;
  created_at: string;
  grinder: { brand: string; model: string };
  bean: { name: string; roaster: string } | null;
}

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
}

function useUserScreen(userId: string) {
  return useQuery(async () => {
    const [recipesRes, profileRes] = await Promise.all([
      supabase
        .from('recipes')
        .select(
          'id, brew_method, grind_setting, upvotes, created_at, grinder:grinders(brand, model), bean:beans(name, roaster)',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      db
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    return {
      brews: (recipesRes.data ?? []) as UserBrew[],
      profile: (profileRes.data ?? null) as UserProfile | null,
    };
  }, [userId]);
}

export default function UserBrewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useUserScreen(id);
  const brews = data?.brews;
  const profile = data?.profile ?? null;

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Profile</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-latte-600 dark:text-latte-500 text-sm text-center">{error}</Text>
        </View>
      ) : (
        <LegendList
          data={brews ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pt-4 pb-12"
          estimatedItemSize={80}
          ListHeaderComponent={
            <View className="mb-5 px-2">
              <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-4 mb-4">
                <AuthorRow
                  userId={id}
                  displayName={profile?.display_name ?? null}
                  avatarUrl={profile?.avatar_url ?? null}
                  variant="header"
                  pressable={false}
                  subtitle={
                    brews && brews.length > 0
                      ? `${brews.length} brew${brews.length !== 1 ? 's' : ''}`
                      : 'No public brews yet'
                  }
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-latte-600 dark:text-latte-500 text-sm">No public brews.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/recipe/${item.id}`)}
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5 mb-3"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-latte-950 dark:text-latte-100 font-medium text-sm">
                    {item.grinder.brand} {item.grinder.model}
                  </Text>
                  <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5">
                    {BREW_METHOD_LABELS[item.brew_method as keyof typeof BREW_METHOD_LABELS] ??
                      item.brew_method}
                    {item.bean ? ` · ${item.bean.name}` : ''}
                    {` · Setting ${item.grind_setting}`}
                  </Text>
                </View>
                {item.upvotes > 0 && (
                  <Text className="text-harvest-500 text-xs font-semibold">▲ {item.upvotes}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
