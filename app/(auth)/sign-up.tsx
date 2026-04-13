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
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useForm } from '@tanstack/react-form';
import { supabase } from '@/lib/supabase';

const PRIVACY_POLICY_URL = 'https://caliburr.coffee/privacy';
const TOS_URL = 'https://caliburr.coffee/terms';

export default function SignUpScreen() {
  const passwordRef = useRef<TextInput>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      const { error } = await supabase.auth.signUp({
        email: value.email,
        password: value.password,
      });
      if (error) {
        setSubmitError(error.message);
      } else {
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: value.email },
        });
      }
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-latte-50 dark:bg-ristretto-900"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-crema-300 text-4xl mb-1 font-display-bold">Caliburr</Text>
        <Text className="text-latte-700 dark:text-latte-400 text-base mb-10">
          Create an account to start dialling in.
        </Text>

        <View className="gap-3 mb-4">
          <form.Field
            name="email"
            validators={{
              onBlur: ({ value }) => (!value.includes('@') ? 'Enter a valid email' : undefined),
            }}
          >
            {(field) => (
              <View className="gap-1">
                <TextInput
                  className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                  style={textInputStyle}
                  placeholder="Email"
                  placeholderTextColor="#6e5a47"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                />
                <Text
                  className="text-xs px-1"
                  style={{
                    color: '#f87171',
                    opacity: field.state.meta.errors.length > 0 ? 1 : 0,
                  }}
                >
                  {field.state.meta.errors[0] ?? ' '}
                </Text>
              </View>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onBlur: ({ value }) =>
                value.length < 6 ? 'Password must be at least 6 characters' : undefined,
            }}
          >
            {(field) => (
              <View className="gap-1">
                <TextInput
                  ref={passwordRef}
                  className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                  style={textInputStyle}
                  placeholder="Password"
                  placeholderTextColor="#6e5a47"
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  passwordRules="minlength: 6;"
                  returnKeyType="done"
                  onSubmitEditing={form.handleSubmit}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                />
                <Text
                  className="text-xs px-1"
                  style={{
                    color: '#f87171',
                    opacity: field.state.meta.errors.length > 0 ? 1 : 0,
                  }}
                >
                  {field.state.meta.errors[0] ?? ' '}
                </Text>
              </View>
            )}
          </form.Field>
        </View>

        {submitError && (
          <Text className="text-sm mb-4" style={{ color: '#f87171' }}>
            {submitError}
          </Text>
        )}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <TouchableOpacity
              onPress={form.handleSubmit}
              disabled={isSubmitting}
              className="bg-harvest-500 rounded-xl py-4 items-center mb-6"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Create Account</Text>
              )}
            </TouchableOpacity>
          )}
        </form.Subscribe>

        <Text className="text-latte-500 dark:text-latte-600 text-xs text-center mb-6 leading-5">
          By creating an account you agree to our{' '}
          <Text className="text-harvest-400" onPress={() => WebBrowser.openBrowserAsync(TOS_URL)}>
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            className="text-harvest-400"
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
          >
            Privacy Policy
          </Text>
          .
        </Text>

        <View className="flex-row justify-center gap-1">
          <Text className="text-latte-600 dark:text-latte-500">Already have an account?</Text>
          <Link href="/(auth)/sign-in">
            <Text className="text-harvest-400 font-semibold">Sign In</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
