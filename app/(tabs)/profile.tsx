import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { GrinderModal } from "@/components/equipment/GrinderModal";
import { MachineModal } from "@/components/equipment/MachineModal";
import type { Grinder, BrewMachine } from "@/lib/types";
import { MACHINE_TYPE_LABELS } from "@/lib/types";

interface UserGrinder {
  grinder_id: string;
  grinder: Grinder;
}

interface UserMachine {
  brew_machine_id: string;
  brew_machine: BrewMachine;
}

export default function ProfileScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [grinders, setGrinders] = useState<UserGrinder[]>([]);
  const [machines, setMachines] = useState<UserMachine[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [grinderModalOpen, setGrinderModalOpen] = useState(false);
  const [machineModalOpen, setMachineModalOpen] = useState(false);

  const fetchEquipment = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email ?? null);

    const [grindersRes, machinesRes] = await Promise.all([
      supabase
        .from("user_grinders")
        .select("grinder_id, grinder:grinders(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_brew_machines")
        .select("brew_machine_id, brew_machine:brew_machines(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    setGrinders((grindersRes.data as UserGrinder[]) ?? []);
    setMachines((machinesRes.data as UserMachine[]) ?? []);
    setLoadingEquipment(false);
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  async function removeGrinder(grinderId: string) {
    setRemovingId(grinderId);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_grinders")
        .delete()
        .eq("user_id", user.id)
        .eq("grinder_id", grinderId);
      setGrinders((prev) => prev.filter((g) => g.grinder_id !== grinderId));
    }
    setRemovingId(null);
  }

  async function removeMachine(machineId: string) {
    setRemovingId(machineId);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_brew_machines")
        .delete()
        .eq("user_id", user.id)
        .eq("brew_machine_id", machineId);
      setMachines((prev) => prev.filter((m) => m.brew_machine_id !== machineId));
    }
    setRemovingId(null);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
  }

  return (
    <View className="flex-1 bg-ristretto-900">
      <ScrollView className="flex-1 px-6 pt-16">
        {/* Header */}
        <Text className="text-latte-100 text-2xl font-bold mb-0.5">My Gear</Text>
        {email && <Text className="text-latte-500 text-sm mb-8">{email}</Text>}

        {loadingEquipment ? (
          <ActivityIndicator color="#ff9d37" style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* Grinders */}
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-latte-200 text-lg font-semibold">Grinders</Text>
                <TouchableOpacity
                  onPress={() => setGrinderModalOpen(true)}
                  className="flex-row items-center gap-1.5"
                >
                  <Text className="text-harvest-400 font-semibold text-sm">+ Add</Text>
                </TouchableOpacity>
              </View>

              {grinders.length === 0 ? (
                <TouchableOpacity
                  onPress={() => setGrinderModalOpen(true)}
                  className="border border-dashed border-ristretto-700 rounded-2xl py-6 items-center"
                >
                  <Text className="text-latte-600 text-sm">Add your first grinder</Text>
                </TouchableOpacity>
              ) : (
                grinders.map(({ grinder_id, grinder }) => (
                  <View
                    key={grinder_id}
                    className="flex-row items-center justify-between bg-ristretto-800 border border-ristretto-700 rounded-2xl px-4 py-3.5 mb-2"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      {grinder.image_url ? (
                        <Image
                          source={{ uri: grinder.image_url }}
                          className="w-12 h-12 rounded-lg bg-ristretto-700"
                          resizeMode="contain"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-lg bg-ristretto-700 items-center justify-center">
                          <Text className="text-latte-600 text-xl">⚙</Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-latte-100 font-medium">
                          {grinder.brand} {grinder.model}
                        </Text>
                        <Text className="text-latte-500 text-xs mt-0.5 capitalize">
                          {grinder.burr_type ?? "—"} · {grinder.adjustment_type ?? "—"}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-3">
                      {grinder.verified && (
                        <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5">
                          <Text className="text-bloom-400 text-xs">Verified</Text>
                        </View>
                      )}
                      {removingId === grinder_id ? (
                        <ActivityIndicator size="small" color="#6e5a47" />
                      ) : (
                        <TouchableOpacity onPress={() => removeGrinder(grinder_id)}>
                          <Text className="text-latte-600 text-lg">×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Machines */}
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-latte-200 text-lg font-semibold">Machines</Text>
                <TouchableOpacity
                  onPress={() => setMachineModalOpen(true)}
                  className="flex-row items-center gap-1.5"
                >
                  <Text className="text-harvest-400 font-semibold text-sm">+ Add</Text>
                </TouchableOpacity>
              </View>

              {machines.length === 0 ? (
                <TouchableOpacity
                  onPress={() => setMachineModalOpen(true)}
                  className="border border-dashed border-ristretto-700 rounded-2xl py-6 items-center"
                >
                  <Text className="text-latte-600 text-sm">Add your first machine</Text>
                </TouchableOpacity>
              ) : (
                machines.map(({ brew_machine_id, brew_machine }) => (
                  <View
                    key={brew_machine_id}
                    className="flex-row items-center justify-between bg-ristretto-800 border border-ristretto-700 rounded-2xl px-4 py-3.5 mb-2"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      {brew_machine.image_url ? (
                        <Image
                          source={{ uri: brew_machine.image_url }}
                          className="w-12 h-12 rounded-lg bg-ristretto-700"
                          resizeMode="contain"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-lg bg-ristretto-700 items-center justify-center">
                          <Text className="text-latte-600 text-xl">☕</Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-latte-100 font-medium">
                          {brew_machine.brand} {brew_machine.model}
                        </Text>
                        <Text className="text-latte-500 text-xs mt-0.5">
                          {MACHINE_TYPE_LABELS[brew_machine.machine_type]}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-3">
                      {brew_machine.verified && (
                        <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5">
                          <Text className="text-bloom-400 text-xs">Verified</Text>
                        </View>
                      )}
                      {removingId === brew_machine_id ? (
                        <ActivityIndicator size="small" color="#6e5a47" />
                      ) : (
                        <TouchableOpacity onPress={() => removeMachine(brew_machine_id)}>
                          <Text className="text-latte-600 text-lg">×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          className="border border-ristretto-700 rounded-xl py-4 items-center mb-12"
        >
          {signingOut ? (
            <ActivityIndicator color="#ff9d37" />
          ) : (
            <Text className="text-harvest-400 font-semibold">Sign Out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <GrinderModal
        visible={grinderModalOpen}
        onClose={() => setGrinderModalOpen(false)}
        onAdded={fetchEquipment}
        existingIds={grinders.map((g) => g.grinder_id)}
      />

      <MachineModal
        visible={machineModalOpen}
        onClose={() => setMachineModalOpen(false)}
        onAdded={fetchEquipment}
        existingIds={machines.map((m) => m.brew_machine_id)}
      />
    </View>
  );
}
