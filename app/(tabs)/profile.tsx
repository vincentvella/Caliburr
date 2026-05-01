import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { useBetaAccess } from '@/hooks/useBetaAccess';
import { AuthorRow } from '@/components/AuthorRow';
import { Skeleton } from '@/components/Skeleton';

const PRIVACY_POLICY_URL = 'https://caliburr.coffee/privacy';
const TOS_URL = 'https://caliburr.coffee/terms';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

interface ProfileSummary {
  email: string | null;
  isAdmin: boolean;
  userId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  recipeCount: number;
  triesReceived: number;
  loaded: boolean;
}

function useProfileSummary(): ProfileSummary {
  const [state, setState] = useState<ProfileSummary>({
    email: null,
    isAdmin: false,
    userId: null,
    displayName: null,
    avatarUrl: null,
    recipeCount: 0,
    triesReceived: 0,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const [profileRes, recipeIdsRes] = await Promise.all([
        db
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('recipes').select('id').eq('user_id', user.id),
      ]);
      if (cancelled) return;

      const recipeIds = (recipeIdsRes.data ?? []).map((r) => r.id);
      let triesReceived = 0;
      if (recipeIds.length > 0) {
        const { count } = await db
          .from('recipe_tries')
          .select('id', { count: 'exact', head: true })
          .in('recipe_id', recipeIds)
          .eq('worked', true);
        if (cancelled) return;
        triesReceived = count ?? 0;
      }

      setState({
        email: user.email ?? null,
        isAdmin: user.app_metadata?.is_admin === true,
        userId: user.id,
        displayName: profileRes.data?.display_name ?? null,
        avatarUrl: profileRes.data?.avatar_url ?? null,
        recipeCount: recipeIds.length,
        triesReceived,
        loaded: true,
      });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

async function resetOnboardingFlag() {
  await supabase.auth.updateUser({ data: { onboarding_completed: null } });
}

export default function ProfileScreen() {
  const { preference, setPreference } = useTheme();
  const summary = useProfileSummary();
  const { isBacker, loading: backerLoading } = useBetaAccess();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Sentry.captureException(error, { tags: { feature: 'sign-out' } });
      setSigningOut(false);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account. Your brews will remain anonymised in the community feed. This cannot be undone.',
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
              let message = 'Failed to delete account. Please try again.';
              try {
                const body = await (error as { context?: Response }).context?.json();
                if (body?.error) message = body.error;
              } catch {}
              Sentry.captureException(error, {
                tags: { feature: 'delete-account', stage: 'edge-function' },
                extra: { message },
              });
              Alert.alert('Error', message);
            } else {
              await supabase.auth.signOut();
            }
          },
        },
      ],
    );
  }

  const subtitleText = summary.loaded
    ? summary.recipeCount > 0
      ? `${summary.recipeCount} brew${summary.recipeCount !== 1 ? 's' : ''}${
          summary.triesReceived > 0
            ? ` · ${summary.triesReceived} successful tr${summary.triesReceived === 1 ? 'y' : 'ies'}`
            : ''
        }`
      : 'No brews yet'
    : ' '; // keep height while loading

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <ScrollView
        className={`flex-1 px-4 ${Platform.OS === 'web' ? 'pt-8' : 'pt-16'}`}
        contentContainerClassName="pb-12"
      >
        {/* Header */}
        <Text className="text-latte-950 dark:text-latte-100 text-2xl mb-1 font-display-bold">
          Profile
        </Text>
        <View className="mb-5 h-5 justify-center">
          {summary.email ? (
            <Text className="text-latte-600 dark:text-latte-500 text-sm">{summary.email}</Text>
          ) : (
            <Skeleton
              className="bg-oat-200 dark:bg-ristretto-700 rounded"
              style={{ height: 12, width: 180 }}
            />
          )}
        </View>

        {/* Identity card */}
        <TouchableOpacity
          onPress={() => router.push('/account/edit-profile')}
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-4 mb-6"
        >
          <View className="flex-row items-center gap-3">
            {summary.userId ? (
              <AuthorRow
                userId={summary.userId}
                displayName={summary.displayName}
                avatarUrl={summary.avatarUrl}
                email={summary.email}
                variant="header"
                pressable={false}
                subtitle={subtitleText}
              />
            ) : (
              <View className="flex-row items-center gap-3 flex-1">
                <Skeleton
                  className="bg-oat-200 dark:bg-ristretto-700"
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
                <View className="flex-1 gap-2">
                  <Skeleton
                    className="bg-oat-200 dark:bg-ristretto-700 rounded"
                    style={{ height: 18, width: '60%' }}
                  />
                  <Skeleton
                    className="bg-oat-200 dark:bg-ristretto-700 rounded"
                    style={{ height: 11, width: '40%' }}
                  />
                </View>
              </View>
            )}
          </View>
          <Text className="text-harvest-400 text-sm font-medium mt-3 self-end">Edit Profile ›</Text>
        </TouchableOpacity>

        {/* Backer banner */}
        {!backerLoading && !isBacker && (
          <TouchableOpacity
            onPress={() => router.push('/backer')}
            className="flex-row items-center gap-3 bg-crema-50 dark:bg-crema-900/20 border border-crema-400 dark:border-crema-700 rounded-2xl px-4 py-3 mb-6"
          >
            <Text style={{ fontSize: 22 }}>☕</Text>
            <View className="flex-1">
              <Text className="text-crema-800 dark:text-crema-300 font-semibold text-sm">
                Support Caliburr
              </Text>
              <Text className="text-crema-700 dark:text-crema-500 text-xs mt-0.5">
                Get a backer badge on your brews
              </Text>
            </View>
            <Text className="text-crema-600 dark:text-crema-500 text-lg">›</Text>
          </TouchableOpacity>
        )}
        {!backerLoading && isBacker && (
          <View className="flex-row items-center gap-3 bg-crema-50 dark:bg-crema-900/20 border border-crema-400 dark:border-crema-700 rounded-2xl px-4 py-3 mb-6">
            <Text style={{ fontSize: 22 }}>☕</Text>
            <View className="flex-1">
              <Text className="text-crema-800 dark:text-crema-300 font-semibold text-sm">
                Caliburr Backer
              </Text>
              <Text className="text-crema-700 dark:text-crema-500 text-xs mt-0.5">
                Thank you for your support
              </Text>
            </View>
          </View>
        )}

        {/* Settings rows */}
        <View className="mb-6 gap-2">
          <SettingsRow label="Change Password" onPress={() => router.push('/account/change-password')} />
          <SettingsRow label="Feature Requests" onPress={() => router.push('/feature-requests')} />
          {summary.isAdmin && (
            <SettingsRow label="Pending Edits" onPress={() => router.push('/admin')} />
          )}
          <SettingsRow label="Contact Support" onPress={() => router.push('/support')} />
          <SettingsRow
            label="Privacy Policy"
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
          />
          <SettingsRow
            label="Terms of Use"
            onPress={() => WebBrowser.openBrowserAsync(TOS_URL)}
          />
        </View>

        {/* Appearance — hidden on web, controlled via nav bar */}
        {Platform.OS !== 'web' && (
          <View className="mb-6">
            <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
              Appearance
            </Text>
            <View className="flex-row bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-1">
              {THEME_OPTIONS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setPreference(value)}
                  className={`flex-1 py-2 rounded-xl items-center ${
                    preference === value ? 'bg-harvest-500' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      preference === value ? 'text-white' : 'text-latte-700 dark:text-latte-400'
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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

        {/* ── Dev tools ────────────────────── */}
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
            <TouchableOpacity
              onPress={() => Sentry.captureException(new Error('Sentry test error'))}
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3 mb-2"
            >
              <Text className="text-latte-700 dark:text-latte-300 text-sm">Test Sentry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SettingsRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5"
    >
      <Text className="text-latte-950 dark:text-latte-100 font-medium">{label}</Text>
      <Text className="text-latte-600 dark:text-latte-500 text-lg">›</Text>
    </TouchableOpacity>
  );
}
