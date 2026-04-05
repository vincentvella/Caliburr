import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

const PRIVACY_POLICY_URL = 'https://caliburr.coffee/privacy';
const SUPPORT_URL = 'https://caliburr.coffee/support';

async function resetOnboardingFlag() {
  await supabase.auth.updateUser({ data: { onboarding_completed: null } });
}

export default function AccountScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSigningOut(false);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account. Your recipes will remain anonymised in the community feed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (!session) {
              setDeletingAccount(false);
              return;
            }
            const { error } = await supabase.functions.invoke('delete-account', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (error) {
              setDeletingAccount(false);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } else {
              await supabase.auth.signOut();
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Profile</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Account</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        {/* Email */}
        {email && (
          <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5 mb-6">
            <Text className="text-latte-600 dark:text-latte-500 text-xs mb-0.5">Signed in as</Text>
            <Text className="text-latte-950 dark:text-latte-100">{email}</Text>
          </View>
        )}

        {/* Settings rows */}
        <View className="mb-8 gap-2">
          <TouchableOpacity
            onPress={() => router.push('/account/change-password')}
            className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5"
          >
            <Text className="text-latte-950 dark:text-latte-100 font-medium">Change Password</Text>
            <Text className="text-latte-600 dark:text-latte-500 text-lg">›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL)}
            className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5"
          >
            <Text className="text-latte-950 dark:text-latte-100 font-medium">Contact Support</Text>
            <Text className="text-latte-600 dark:text-latte-500 text-lg">›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
            className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5"
          >
            <Text className="text-latte-950 dark:text-latte-100 font-medium">Privacy Policy</Text>
            <Text className="text-latte-600 dark:text-latte-500 text-lg">›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          className="border border-latte-200 dark:border-ristretto-700 rounded-xl py-4 items-center mb-3"
        >
          {signingOut ? (
            <ActivityIndicator color="#ff9d37" />
          ) : (
            <Text className="text-harvest-400 font-semibold">Sign Out</Text>
          )}
        </TouchableOpacity>

        {/* Delete account */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          className="rounded-xl py-4 items-center mb-6"
        >
          {deletingAccount ? (
            <ActivityIndicator color="#f87171" />
          ) : (
            <Text className="text-red-400 text-sm">Delete Account</Text>
          )}
        </TouchableOpacity>

        {/* ── Dev tools (development builds only) ────────────────────── */}
        {__DEV__ && (
          <View className="border border-dashed border-latte-300 dark:border-ristretto-700 rounded-2xl p-4 mb-12">
            <Text className="text-latte-500 dark:text-latte-600 text-xs font-mono mb-3">
              DEV TOOLS
            </Text>
            <TouchableOpacity
              onPress={async () => {
                await resetOnboardingFlag();
                router.push('/onboarding?preview=1');
              }}
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3 mb-2"
            >
              <Text className="text-latte-700 dark:text-latte-300 text-sm">Preview onboarding</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
