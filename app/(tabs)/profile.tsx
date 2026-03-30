import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-ristretto-900 px-6 pt-16">
      <Text className="text-latte-100 text-2xl font-bold mb-1">Profile</Text>
      <Text className="text-latte-500 text-sm mb-10">Manage your account.</Text>

      <TouchableOpacity
        onPress={handleSignOut}
        disabled={loading}
        className="border border-ristretto-700 rounded-xl py-4 items-center"
      >
        {loading ? (
          <ActivityIndicator color="#ff9d37" />
        ) : (
          <Text className="text-harvest-400 font-semibold">Sign Out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
