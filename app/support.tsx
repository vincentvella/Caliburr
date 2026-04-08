import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useBetaAccess } from '@/hooks/useBetaAccess';
import { haptics } from '@/lib/haptics';

function useAuthEmail() {
  const [email, setEmail] = useState('');
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);
  return { email, setEmail };
}

export default function SupportScreen() {
  const [name, setName] = useState('');
  const { email, setEmail } = useAuthEmail();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isBacker } = useBetaAccess();

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from('support_requests').insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      user_id: user?.id ?? null,
      is_backer: isBacker,
    });

    setSubmitting(false);
    if (insertError) {
      haptics.error();
      setError('Something went wrong. Please try again or email support@caliburr.coffee directly.');
    } else {
      haptics.success();
      setSubmitted(true);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-latte-50 dark:bg-ristretto-900"
      >
        <ScrollView
          contentContainerClassName="max-w-2xl w-full self-center px-6 pt-16 pb-24"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-latte-950 dark:text-latte-100 text-3xl font-bold mb-1">
            Support
          </Text>

          {isBacker ? (
            <View className="flex-row items-center gap-2 mb-6 mt-2">
              <View className="bg-crema-900/30 border border-crema-700 rounded-full px-2.5 py-1">
                <Text className="text-crema-400 text-xs font-semibold">🎧 Priority Support</Text>
              </View>
              <Text className="text-latte-500 dark:text-latte-600 text-xs">
                Backer requests are reviewed first
              </Text>
            </View>
          ) : (
            <Text className="text-latte-600 dark:text-latte-500 text-sm mb-8 mt-1">
              We usually respond within 24 hours.
            </Text>
          )}

          {submitted ? (
            <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-6">
              <Text className="text-latte-950 dark:text-latte-100 text-lg font-semibold mb-2">
                Message received
              </Text>
              <Text className="text-latte-600 dark:text-latte-500 text-sm leading-6">
                Thanks for reaching out. We&apos;ll get back to you at {email} as soon as possible.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              <TextInput
                className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                style={{ lineHeight: undefined }}
                placeholder="Name"
                placeholderTextColor="#6e5a47"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                style={{ lineHeight: undefined }}
                placeholder="Email"
                placeholderTextColor="#6e5a47"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                style={{ lineHeight: undefined, minHeight: 140, textAlignVertical: 'top' }}
                placeholder="How can we help?"
                placeholderTextColor="#6e5a47"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
              />

              {error && (
                <Text className="text-sm" style={{ color: '#f87171' }}>
                  {error}
                </Text>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                className="bg-harvest-500 rounded-xl py-4 items-center mt-1"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Send Message</Text>
                )}
              </TouchableOpacity>

              <View className="mt-8 p-5 bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl">
                <Text className="text-latte-600 dark:text-latte-500 text-sm leading-6">
                  You can also reach us directly at{' '}
                  <Text className="text-latte-800 dark:text-latte-300 font-semibold">
                    support@caliburr.coffee
                  </Text>
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
