import { textInputStyle } from '@/lib/styles';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<TextInput>(null);

  async function handleSubmit() {
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: supabaseError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (supabaseError) {
      setError(supabaseError.message);
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-latte-50 dark:bg-ristretto-900"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-harvest-500 text-4xl font-bold mb-1">New Password</Text>
        <Text className="text-latte-700 dark:text-latte-400 text-base mb-10">
          Choose a new password for your account.
        </Text>

        <View className="gap-3 mb-4">
          <TextInput
            className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
            style={textInputStyle}
            placeholder="New password"
            placeholderTextColor="#9c7a5e"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            ref={confirmRef}
            className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
            style={textInputStyle}
            placeholder="Confirm password"
            placeholderTextColor="#9c7a5e"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            value={confirm}
            onChangeText={setConfirm}
          />
          {error && (
            <Text className="text-xs px-1" style={{ color: '#f87171' }}>
              {error}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="bg-harvest-500 rounded-xl py-4 items-center"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Update Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
