import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError(null);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      setError(error.message);
    } else {
      setResent(true);
    }
  }

  return (
    <View className="flex-1 bg-ristretto-900 justify-center px-6">
      <Text className="text-crema-300 text-4xl font-bold mb-1">Check your inbox</Text>
      <Text className="text-latte-400 text-base mb-2">
        We sent a confirmation link to:
      </Text>
      <Text className="text-latte-100 font-semibold text-base mb-10">{email}</Text>

      <Text className="text-latte-500 text-sm mb-8 leading-relaxed">
        Tap the link in that email to activate your account, then come back and sign in.
      </Text>

      {error && (
        <Text className="text-sm mb-4" style={{ color: "#f87171" }}>
          {error}
        </Text>
      )}

      {resent ? (
        <Text className="text-bloom-400 text-sm text-center mb-6">
          Email resent — check your inbox.
        </Text>
      ) : (
        <TouchableOpacity
          onPress={handleResend}
          disabled={resending}
          className="border border-ristretto-700 rounded-xl py-4 items-center mb-6"
        >
          {resending ? (
            <ActivityIndicator color="#ff9d37" />
          ) : (
            <Text className="text-harvest-400 font-semibold">Resend Email</Text>
          )}
        </TouchableOpacity>
      )}

      <View className="flex-row justify-center gap-1">
        <Text className="text-latte-500">Already verified?</Text>
        <Link href="/(auth)/sign-in">
          <Text className="text-harvest-400 font-semibold">Sign In</Text>
        </Link>
      </View>
    </View>
  );
}
