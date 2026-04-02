import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GrinderModal } from '@/components/equipment/GrinderModal';
import { MachineModal } from '@/components/equipment/MachineModal';
import type { Grinder, BrewMachine } from '@/lib/types';
import { MACHINE_TYPE_LABELS } from '@/lib/types';

interface UserGrinder {
  grinder_id: string;
  grinder: Grinder;
  is_default: boolean;
}

interface UserMachine {
  brew_machine_id: string;
  brew_machine: BrewMachine;
  is_default: boolean;
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
  const [editingGrinder, setEditingGrinder] = useState<Grinder | null>(null);

  async function fetchEquipment() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email ?? null);

    const [userGrindersRes, userMachinesRes] = await Promise.all([
      supabase
        .from('user_grinders')
        .select('grinder_id, is_default')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_brew_machines')
        .select('brew_machine_id, is_default')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    const grinderIds = (userGrindersRes.data ?? []).map((r) => r.grinder_id);
    const machineIds = (userMachinesRes.data ?? []).map((r) => r.brew_machine_id);

    const [grindersRes, machinesRes] = await Promise.all([
      supabase.from('grinders').select('*').in('id', grinderIds),
      supabase.from('brew_machines').select('*').in('id', machineIds),
    ]);

    const grindersById = new Map((grindersRes.data ?? []).map((g) => [g.id, g]));
    const machinesById = new Map((machinesRes.data ?? []).map((m) => [m.id, m]));

    setGrinders(
      (userGrindersRes.data ?? []).flatMap((row) => {
        const grinder = grindersById.get(row.grinder_id);
        if (!grinder) return [];
        return [{ grinder_id: row.grinder_id, is_default: row.is_default, grinder }];
      }),
    );
    setMachines(
      (userMachinesRes.data ?? []).flatMap((row) => {
        const brew_machine = machinesById.get(row.brew_machine_id);
        if (!brew_machine) return [];
        return [{ brew_machine_id: row.brew_machine_id, is_default: row.is_default, brew_machine }];
      }),
    );
    setLoadingEquipment(false);
  }

  useEffect(() => {
    fetchEquipment();
  }, []);

  function removeGrinder(grinderId: string) {
    Alert.alert('Remove Grinder', 'Remove this grinder from your gear?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemovingId(grinderId);
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from('user_grinders')
              .delete()
              .eq('user_id', user.id)
              .eq('grinder_id', grinderId);
            if (error) {
              Alert.alert('Error', 'Failed to remove grinder. Please try again.');
            } else {
              setGrinders((prev) => prev.filter((g) => g.grinder_id !== grinderId));
            }
          }
          setRemovingId(null);
        },
      },
    ]);
  }

  function removeMachine(machineId: string) {
    Alert.alert('Remove Machine', 'Remove this machine from your gear?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemovingId(machineId);
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from('user_brew_machines')
              .delete()
              .eq('user_id', user.id)
              .eq('brew_machine_id', machineId);
            if (error) {
              Alert.alert('Error', 'Failed to remove machine. Please try again.');
            } else {
              setMachines((prev) => prev.filter((m) => m.brew_machine_id !== machineId));
            }
          }
          setRemovingId(null);
        },
      },
    ]);
  }

  async function toggleDefaultGrinder(grinderId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isAlreadyDefault = grinders.find((g) => g.grinder_id === grinderId)?.is_default ?? false;

    if (isAlreadyDefault) {
      await supabase
        .from('user_grinders')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('grinder_id', grinderId);
      setGrinders((prev) =>
        prev.map((g) => (g.grinder_id === grinderId ? { ...g, is_default: false } : g)),
      );
    } else {
      await supabase.from('user_grinders').update({ is_default: false }).eq('user_id', user.id);
      await supabase
        .from('user_grinders')
        .update({ is_default: true })
        .eq('user_id', user.id)
        .eq('grinder_id', grinderId);
      setGrinders((prev) => prev.map((g) => ({ ...g, is_default: g.grinder_id === grinderId })));
    }
  }

  async function toggleDefaultMachine(machineId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isAlreadyDefault =
      machines.find((m) => m.brew_machine_id === machineId)?.is_default ?? false;

    if (isAlreadyDefault) {
      // Deselect
      await supabase
        .from('user_brew_machines')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('brew_machine_id', machineId);
      setMachines((prev) =>
        prev.map((m) => (m.brew_machine_id === machineId ? { ...m, is_default: false } : m)),
      );
    } else {
      // Clear any existing default, then set this one
      await supabase
        .from('user_brew_machines')
        .update({ is_default: false })
        .eq('user_id', user.id);
      await supabase
        .from('user_brew_machines')
        .update({ is_default: true })
        .eq('user_id', user.id)
        .eq('brew_machine_id', machineId);
      setMachines((prev) =>
        prev.map((m) => ({
          ...m,
          is_default: m.brew_machine_id === machineId,
        })),
      );
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSigningOut(false);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
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
                <>
                  {grinders.map(({ grinder_id, grinder, is_default }) => (
                    <TouchableOpacity
                      key={grinder_id}
                      onPress={() => {
                        setEditingGrinder(grinder);
                        setGrinderModalOpen(true);
                      }}
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
                            {grinder.burr_type ?? '—'} · {grinder.adjustment_type ?? '—'}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-3">
                        {grinder.verified && (
                          <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5">
                            <Text className="text-bloom-400 text-xs">Verified</Text>
                          </View>
                        )}
                        <TouchableOpacity onPress={() => toggleDefaultGrinder(grinder_id)}>
                          <Text
                            style={{
                              fontSize: 18,
                              color: is_default ? '#ff9d37' : '#4a3728',
                            }}
                          >
                            ★
                          </Text>
                        </TouchableOpacity>
                        {removingId === grinder_id ? (
                          <ActivityIndicator size="small" color="#6e5a47" />
                        ) : (
                          <TouchableOpacity onPress={() => removeGrinder(grinder_id)}>
                            <Text className="text-latte-600 text-lg">×</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {grinders.some((g) => g.is_default) && (
                    <Text className="text-latte-600 text-xs px-1 mt-1">
                      ★ Pre-selected when creating a recipe
                    </Text>
                  )}
                </>
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
                <>
                  {machines.map(({ brew_machine_id, brew_machine, is_default }) => (
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
                        <TouchableOpacity onPress={() => toggleDefaultMachine(brew_machine_id)}>
                          <Text
                            style={{
                              fontSize: 18,
                              color: is_default ? '#ff9d37' : '#4a3728',
                            }}
                          >
                            ★
                          </Text>
                        </TouchableOpacity>
                        {removingId === brew_machine_id ? (
                          <ActivityIndicator size="small" color="#6e5a47" />
                        ) : (
                          <TouchableOpacity onPress={() => removeMachine(brew_machine_id)}>
                            <Text className="text-latte-600 text-lg">×</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                  {machines.some((m) => m.is_default) && (
                    <Text className="text-latte-600 text-xs px-1 mt-1">
                      ★ Pre-selected when creating a recipe
                    </Text>
                  )}
                </>
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
        onClose={() => {
          setGrinderModalOpen(false);
          setEditingGrinder(null);
        }}
        onAdded={fetchEquipment}
        existingIds={grinders.map((g) => g.grinder_id)}
        editGrinder={editingGrinder ?? undefined}
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
