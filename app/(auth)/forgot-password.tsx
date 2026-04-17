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
import { useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: 'caliburr://',
    });
    setLoading(false);
    if (supabaseError) {
      setError(supabaseError.message);
    } else {
      setSent(true);
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
        <Text className="text-harvest-500 text-4xl font-bold mb-1">Reset Password</Text>
        <Text className="text-latte-700 dark:text-latte-400 text-base mb-10">
          {sent
            ? 'Check your email for a reset link. It may take a minute to arrive.'
            : "Enter your email and we'll send you a reset link."}
        </Text>

        {!sent && (
          <>
            <View className="mb-4">
              <TextInput
                className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                style={textInputStyle}
                placeholder="Email"
                placeholderTextColor="#9c7a5e"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                value={email}
                onChangeText={setEmail}
              />
              {error && (
                <Text className="text-xs px-1 mt-1" style={{ color: '#f87171' }}>
                  {error}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="bg-harvest-500 rounded-xl py-4 items-center mb-6"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => router.back()} className="items-center">
          <Text className="text-harvest-600 dark:text-harvest-400 font-semibold">
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
