import { textInputStyle } from '@/lib/styles';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  bannedUntil: string | null;
}

interface UserRecipe {
  id: string;
  brew_method: string;
  grind_setting: string;
  upvotes: number;
  created_at: string;
  grinder: { brand: string; model: string } | null;
}

async function invokeUsersAdmin<T>(body: object): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body,
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  return data as T;
}

export default function AdminUsersScreen() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Record<string, UserRecipe[]>>({});
  const [loadingRecipes, setLoadingRecipes] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    searchTimer.current = setTimeout(() => doSearch(text), 400);
  }

  async function doSearch(email: string) {
    setSearching(true);
    setSearched(true);
    try {
      const { users } = await invokeUsersAdmin<{ users: AdminUser[] }>({
        action: 'search',
        email,
      });
      setResults(users);
    } catch {
      Alert.alert('Error', 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function toggleExpand(userId: string) {
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(userId);
    if (recipes[userId]) return;

    setLoadingRecipes(userId);
    const { data } = await supabase
      .from('recipes')
      .select('id, brew_method, grind_setting, upvotes, created_at, grinder:grinders(brand, model)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecipes((prev) => ({ ...prev, [userId]: (data ?? []) as UserRecipe[] }));
    setLoadingRecipes(null);
  }

  async function handleBan(user: AdminUser) {
    const isBanned = !!user.bannedUntil;
    Alert.alert(
      isBanned ? 'Unban User' : 'Ban User',
      isBanned
        ? `Restore access for ${user.email}?`
        : `Ban ${user.email}? They will be immediately signed out and unable to sign in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBanned ? 'Unban' : 'Ban',
          style: isBanned ? 'default' : 'destructive',
          onPress: async () => {
            setActioningId(user.id);
            try {
              await invokeUsersAdmin({ action: isBanned ? 'unban' : 'ban', userId: user.id });
              setResults((prev) =>
                prev.map((u) =>
                  u.id === user.id
                    ? { ...u, bannedUntil: isBanned ? null : new Date().toISOString() }
                    : u,
                ),
              );
            } catch {
              Alert.alert('Error', 'Action failed. Please try again.');
            } finally {
              setActioningId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Users</Text>
        <View style={{ width: 64 }} />
      </View>

      <View className="px-4 pt-3 pb-2">
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search by email…"
          placeholderTextColor="#9b7b60"
          autoCapitalize="none"
          keyboardType="email-address"
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3 text-latte-950 dark:text-latte-100 text-sm"
          style={textInputStyle}
        />
      </View>

      {searching ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : !searched ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-latte-500 dark:text-latte-600 text-sm">
            Search for a user by email.
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-latte-600 dark:text-latte-500 text-sm">No users found.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-2">
          {results.map((user) => {
            const isBanned = !!user.bannedUntil;
            const isExpanded = expandedId === user.id;

            return (
              <View
                key={user.id}
                className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl mb-3 overflow-hidden"
              >
                {/* User row */}
                <View className="flex-row items-center px-4 py-3.5">
                  <TouchableOpacity className="flex-1" onPress={() => toggleExpand(user.id)}>
                    <View className="flex-row items-center gap-2 mb-0.5">
                      <Text
                        className="text-latte-950 dark:text-latte-100 font-medium"
                        numberOfLines={1}
                      >
                        {user.email}
                      </Text>
                      {isBanned && (
                        <View className="bg-red-500/20 border border-red-500/40 rounded-full px-2 py-0.5">
                          <Text className="text-red-400 text-xs font-medium">Banned</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-latte-500 dark:text-latte-600 text-xs">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                      {isExpanded ? '  ▴' : '  ▾'}
                    </Text>
                  </TouchableOpacity>

                  {actioningId === user.id ? (
                    <ActivityIndicator color="#ff9d37" size="small" style={{ marginLeft: 12 }} />
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleBan(user)}
                      className={`ml-3 rounded-lg px-3 py-1.5 border ${
                        isBanned
                          ? 'border-latte-300 dark:border-ristretto-600'
                          : 'border-red-500/40 bg-red-500/10'
                      }`}
                    >
                      <Text
                        className={
                          isBanned
                            ? 'text-latte-600 dark:text-latte-400 text-sm'
                            : 'text-red-400 text-sm font-medium'
                        }
                      >
                        {isBanned ? 'Unban' : 'Ban'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Expanded recipes */}
                {isExpanded && (
                  <View className="border-t border-latte-200 dark:border-ristretto-700">
                    {loadingRecipes === user.id ? (
                      <ActivityIndicator color="#ff9d37" style={{ marginVertical: 16 }} />
                    ) : (recipes[user.id] ?? []).length === 0 ? (
                      <Text className="text-latte-500 dark:text-latte-600 text-sm px-4 py-4">
                        No recipes.
                      </Text>
                    ) : (
                      (recipes[user.id] ?? []).map((recipe, i) => (
                        <View
                          key={recipe.id}
                          className={`px-4 py-3 ${
                            i < (recipes[user.id] ?? []).length - 1
                              ? 'border-b border-latte-200 dark:border-ristretto-700'
                              : ''
                          }`}
                        >
                          <Text
                            className="text-latte-950 dark:text-latte-100 text-sm"
                            numberOfLines={1}
                          >
                            {recipe.grinder
                              ? `${recipe.grinder.brand} ${recipe.grinder.model}`
                              : 'Unknown grinder'}{' '}
                            · {recipe.brew_method.replace(/_/g, ' ')}
                          </Text>
                          <Text className="text-latte-500 dark:text-latte-600 text-xs mt-0.5">
                            Grind {recipe.grind_setting} · {recipe.upvotes} ↑ ·{' '}
                            {new Date(recipe.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
          <View className="h-12" />
        </ScrollView>
      )}
    </View>
  );
}
