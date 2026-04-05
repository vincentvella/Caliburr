import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
  const confirmRef = useRef<TextInput>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setError(null);
    setSuccess(false);
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    }
  }

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
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Change Password</Text>
        <View style={{ width: 80 }} />
      </View>

      <View className="px-6 pt-6 gap-3">
        <TextInput
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100"
          style={{ lineHeight: undefined }}
          placeholder="New password"
          placeholderTextColor="#6e5a47"
          secureTextEntry
          autoFocus
          returnKeyType="next"
          value={newPassword}
          onChangeText={setNewPassword}
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <TextInput
          ref={confirmRef}
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100"
          style={{ lineHeight: undefined }}
          placeholder="Confirm new password"
          placeholderTextColor="#6e5a47"
          secureTextEntry
          returnKeyType="done"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onSubmitEditing={handleSave}
        />
        {error && (
          <Text className="text-xs px-1" style={{ color: '#f87171' }}>
            {error}
          </Text>
        )}
        {success && (
          <Text className="text-xs px-1" style={{ color: '#4ade80' }}>
            Password updated.
          </Text>
        )}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-harvest-500 rounded-xl py-3.5 items-center mt-1"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
