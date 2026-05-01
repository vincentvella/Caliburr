import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { textInputStyle } from '@/lib/styles';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { pickAndUploadAvatar } from '@/lib/uploadImage';
import { EditableAvatar } from '@/components/EditableAvatar';

export default function EditProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [savedDisplayName, setSavedDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setUserId(user.id);
      setEmail(user.email ?? null);
      const { data: profile } = await db
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const name = profile?.display_name ?? '';
      setDisplayName(name);
      setSavedDisplayName(name);
      setAvatarUrl(profile?.avatar_url ?? null);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persistDisplayName() {
    if (!userId) return;
    const normalized = displayName.trim().toLowerCase();
    if (normalized.length === 0 || normalized === savedDisplayName.toLowerCase()) return;
    setSaving(true);
    setNameError(null);
    const { error } = await db
      .from('profiles')
      .update({ display_name: normalized })
      .eq('user_id', userId);
    setSaving(false);
    if (error) {
      // Postgres unique violation = 23505. Surface a friendly inline message
      // and don't ping Sentry — this is an expected user error.
      if (error.code === '23505') {
        setNameError('That handle is already taken. Try another.');
        return;
      }
      Sentry.captureException(error, { tags: { feature: 'profile', stage: 'name-update' } });
      Alert.alert('Error', 'Could not save your name. Please try again.');
      return;
    }
    setDisplayName(normalized);
    setSavedDisplayName(normalized);
  }

  async function handlePickAvatar() {
    if (!userId) return;
    setUploadingAvatar(true);
    const url = await pickAndUploadAvatar();
    if (url) {
      const { error } = await db.from('profiles').update({ avatar_url: url }).eq('user_id', userId);
      if (error) {
        Sentry.captureException(error, { tags: { feature: 'profile', stage: 'avatar-update' } });
        Alert.alert('Error', 'Avatar uploaded but profile not saved. Please try again.');
      } else {
        setAvatarUrl(url);
      }
    }
    setUploadingAvatar(false);
  }

  const trimmed = displayName.trim();
  const dirty = trimmed.length > 0 && trimmed !== savedDisplayName;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-latte-50 dark:bg-ristretto-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Account</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Edit Profile</Text>
        <View style={{ width: 80 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-8" keyboardShouldPersistTaps="handled">
          <View className="mb-8 items-center">
            <EditableAvatar
              email={email}
              displayName={displayName}
              avatarUrl={avatarUrl}
              uploading={uploadingAvatar}
              onPress={handlePickAvatar}
            />
          </View>

          <View className="gap-2 mb-4">
            <Text className="text-latte-600 dark:text-latte-500 text-xs uppercase tracking-wide px-1">
              Handle
            </Text>
            <TextInput
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
              style={textInputStyle}
              placeholder="your_handle"
              placeholderTextColor="#9c7a5e"
              value={displayName}
              onChangeText={(v) => {
                setDisplayName(v);
                if (nameError) setNameError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={persistDisplayName}
            />
            {nameError ? (
              <Text className="text-xs px-1" style={{ color: '#f87171' }}>
                {nameError}
              </Text>
            ) : (
              <Text className="text-latte-500 dark:text-latte-600 text-xs px-1">
                This is what other users see on your recipes and tries.
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={persistDisplayName}
            disabled={saving || !dirty}
            className={`rounded-xl py-4 items-center mt-2 ${dirty ? 'bg-harvest-500' : 'bg-harvest-500/40'}`}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
