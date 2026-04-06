import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useUniwind } from 'uniwind';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useScreenshotMode } from '@/lib/useScreenshotMode';
import { supabase } from '@/lib/supabase';
import { useTheme, type ThemePreference } from '@/lib/theme';
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

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function ProfileScreen() {
  const screenshotMode = useScreenshotMode();
  const { preference, setPreference } = useTheme();
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState<string | null>(null);
  const [grinders, setGrinders] = useState<UserGrinder[]>([]);
  const [machines, setMachines] = useState<UserMachine[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [grinderModalOpen, setGrinderModalOpen] = useState(false);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [editingGrinder, setEditingGrinder] = useState<Grinder | null>(null);
  const [pendingGrinderEditIds, setPendingGrinderEditIds] = useState<Set<string>>(new Set());
  const [pendingMachineEditIds, setPendingMachineEditIds] = useState<Set<string>>(new Set());

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

    const [grindersRes, machinesRes, grinderEditsRes, machineEditsRes] = await Promise.all([
      supabase.from('grinders').select('*').in('id', grinderIds),
      supabase.from('brew_machines').select('*').in('id', machineIds),
      grinderIds.length
        ? supabase
            .from('grinder_edits')
            .select('grinder_id')
            .in('grinder_id', grinderIds)
            .eq('status', 'pending')
        : Promise.resolve({ data: [] }),
      machineIds.length
        ? supabase
            .from('machine_edits')
            .select('machine_id')
            .in('machine_id', machineIds)
            .eq('status', 'pending')
        : Promise.resolve({ data: [] }),
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
    setPendingGrinderEditIds(new Set((grinderEditsRes.data ?? []).map((e) => e.grinder_id)));
    setPendingMachineEditIds(new Set((machineEditsRes.data ?? []).map((e) => e.machine_id)));
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

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <ScrollView className="flex-1 px-6 pt-16">
        {/* Header */}
        <Text className="text-latte-950 dark:text-latte-100 text-2xl mb-0.5 font-display-bold">
          My Gear
        </Text>
        {email && !screenshotMode && (
          <Text className="text-latte-600 dark:text-latte-500 text-sm mb-8">{email}</Text>
        )}

        {loadingEquipment ? (
          <ActivityIndicator color="#ff9d37" style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* Grinders */}
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-latte-800 dark:text-latte-200 text-lg font-semibold">
                  Grinders
                </Text>
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
                  className="border border-dashed border-latte-300 dark:border-ristretto-700 rounded-2xl py-6 items-center"
                >
                  <Text className="text-latte-500 dark:text-latte-600 text-sm">
                    Add your first grinder
                  </Text>
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
                      className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5 mb-2"
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        {grinder.image_url ? (
                          <Image
                            source={{ uri: grinder.image_url }}
                            className="w-12 h-12 rounded-lg bg-oat-200 dark:bg-ristretto-700"
                            resizeMode="contain"
                          />
                        ) : (
                          <View className="w-12 h-12 rounded-lg bg-oat-200 dark:bg-ristretto-700 items-center justify-center">
                            <Text className="text-latte-500 dark:text-latte-600 text-xl">⚙</Text>
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-latte-950 dark:text-latte-100 font-medium">
                            {grinder.brand} {grinder.model}
                          </Text>
                          <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5 capitalize">
                            {grinder.burr_type ?? '—'} · {grinder.adjustment_type ?? '—'}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-3">
                        {grinder.verified ? (
                          <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-full px-2 py-0.5">
                            <Text className="text-bloom-700 dark:text-bloom-400 text-xs">
                              Verified
                            </Text>
                          </View>
                        ) : pendingGrinderEditIds.has(grinder_id) ? (
                          <View className="bg-crema-100 dark:bg-crema-900 border border-crema-300 dark:border-crema-700 rounded-full px-2 py-0.5">
                            <Text className="text-crema-700 dark:text-crema-400 text-xs">
                              Edit pending
                            </Text>
                          </View>
                        ) : null}
                        <TouchableOpacity onPress={() => toggleDefaultGrinder(grinder_id)}>
                          <Text
                            style={{
                              fontSize: 18,
                              color: is_default ? '#ff9d37' : isDark ? '#c8824a' : '#b5693a',
                            }}
                          >
                            {is_default || isDark ? '★' : '☆'}
                          </Text>
                        </TouchableOpacity>
                        {removingId === grinder_id ? (
                          <ActivityIndicator size="small" color="#6e5a47" />
                        ) : (
                          <TouchableOpacity onPress={() => removeGrinder(grinder_id)}>
                            <Text className="text-latte-500 dark:text-latte-600 text-lg">×</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {grinders.some((g) => g.is_default) && (
                    <Text className="text-latte-500 dark:text-latte-600 text-xs px-1 mt-1">
                      ★ Pre-selected when creating a recipe
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* Machines */}
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-latte-800 dark:text-latte-200 text-lg font-semibold">
                  Machines
                </Text>
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
                  className="border border-dashed border-latte-300 dark:border-ristretto-700 rounded-2xl py-6 items-center"
                >
                  <Text className="text-latte-500 dark:text-latte-600 text-sm">
                    Add your first machine
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  {machines.map(({ brew_machine_id, brew_machine, is_default }) => (
                    <View
                      key={brew_machine_id}
                      className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5 mb-2"
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        {brew_machine.image_url ? (
                          <Image
                            source={{ uri: brew_machine.image_url }}
                            className="w-12 h-12 rounded-lg bg-oat-200 dark:bg-ristretto-700"
                            resizeMode="contain"
                          />
                        ) : (
                          <View className="w-12 h-12 rounded-lg bg-oat-200 dark:bg-ristretto-700 items-center justify-center">
                            <Text className="text-latte-500 dark:text-latte-600 text-xl">☕</Text>
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-latte-950 dark:text-latte-100 font-medium">
                            {brew_machine.brand} {brew_machine.model}
                          </Text>
                          <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5">
                            {MACHINE_TYPE_LABELS[brew_machine.machine_type]}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-3">
                        {brew_machine.verified ? (
                          <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-full px-2 py-0.5">
                            <Text className="text-bloom-700 dark:text-bloom-400 text-xs">
                              Verified
                            </Text>
                          </View>
                        ) : pendingMachineEditIds.has(brew_machine_id) ? (
                          <View className="bg-crema-100 dark:bg-crema-900 border border-crema-300 dark:border-crema-700 rounded-full px-2 py-0.5">
                            <Text className="text-crema-700 dark:text-crema-400 text-xs">
                              Edit pending
                            </Text>
                          </View>
                        ) : null}
                        <TouchableOpacity onPress={() => toggleDefaultMachine(brew_machine_id)}>
                          <Text
                            style={{
                              fontSize: 18,
                              color: is_default ? '#ff9d37' : isDark ? '#c8824a' : '#b5693a',
                            }}
                          >
                            {is_default || isDark ? '★' : '☆'}
                          </Text>
                        </TouchableOpacity>
                        {removingId === brew_machine_id ? (
                          <ActivityIndicator size="small" color="#6e5a47" />
                        ) : (
                          <TouchableOpacity onPress={() => removeMachine(brew_machine_id)}>
                            <Text className="text-latte-500 dark:text-latte-600 text-lg">×</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                  {machines.some((m) => m.is_default) && (
                    <Text className="text-latte-500 dark:text-latte-600 text-xs px-1 mt-1">
                      ★ Pre-selected when creating a recipe
                    </Text>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {/* Appearance */}
        <View className="mb-4">
          <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Appearance
          </Text>
          <View className="flex-row bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-1">
            {THEME_OPTIONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                onPress={() => setPreference(value)}
                className={`flex-1 py-2 rounded-xl items-center ${
                  preference === value ? 'bg-harvest-500' : ''
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    preference === value ? 'text-white' : 'text-latte-700 dark:text-latte-400'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Settings */}
        <TouchableOpacity
          onPress={() => router.push('/account')}
          testID="account-settings-row"
          className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5 mb-12"
        >
          <Text className="text-latte-950 dark:text-latte-100 font-medium">Account Settings</Text>
          <Text className="text-latte-600 dark:text-latte-500 text-lg">›</Text>
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
