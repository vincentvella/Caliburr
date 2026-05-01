import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useUniwind } from 'uniwind';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';
import { haptics } from '@/lib/haptics';
import { GrinderModal } from '@/components/equipment/GrinderModal';
import { MachineModal } from '@/components/equipment/MachineModal';
import { Skeleton } from '@/components/Skeleton';
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

function useEquipment() {
  const [grinders, setGrinders] = useState<UserGrinder[]>([]);
  const [machines, setMachines] = useState<UserMachine[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [pendingGrinderEditIds, setPendingGrinderEditIds] = useState<Set<string>>(new Set());
  const [pendingMachineEditIds, setPendingMachineEditIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEquipment();
  }, []);

  async function fetchEquipment() {
    setEquipmentError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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

      if (userGrindersRes.error) throw new Error(userGrindersRes.error.message);
      if (userMachinesRes.error) throw new Error(userMachinesRes.error.message);

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
          return [
            { brew_machine_id: row.brew_machine_id, is_default: row.is_default, brew_machine },
          ];
        }),
      );
      setPendingGrinderEditIds(new Set((grinderEditsRes.data ?? []).map((e) => e.grinder_id)));
      setPendingMachineEditIds(new Set((machineEditsRes.data ?? []).map((e) => e.machine_id)));
    } catch (e) {
      setEquipmentError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoadingEquipment(false);
    }
  }

  return {
    grinders,
    setGrinders,
    machines,
    setMachines,
    loadingEquipment,
    equipmentError,
    pendingGrinderEditIds,
    pendingMachineEditIds,
    fetchEquipment,
  };
}

export default function GearScreen() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const {
    grinders,
    setGrinders,
    machines,
    setMachines,
    loadingEquipment,
    equipmentError,
    pendingGrinderEditIds,
    pendingMachineEditIds,
    fetchEquipment,
  } = useEquipment();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [grinderModalOpen, setGrinderModalOpen] = useState(false);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [editingGrinder, setEditingGrinder] = useState<Grinder | null>(null);

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
              Sentry.captureException(error, {
                tags: { feature: 'equipment-remove', kind: 'grinder' },
                extra: { grinderId, userId: user.id },
              });
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
              Sentry.captureException(error, {
                tags: { feature: 'equipment-remove', kind: 'machine' },
                extra: { machineId, userId: user.id },
              });
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

    haptics.medium();
    // Optimistic update
    setGrinders((prev) =>
      isAlreadyDefault
        ? prev.map((g) => (g.grinder_id === grinderId ? { ...g, is_default: false } : g))
        : prev.map((g) => ({ ...g, is_default: g.grinder_id === grinderId })),
    );

    try {
      if (isAlreadyDefault) {
        const { error } = await supabase
          .from('user_grinders')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('grinder_id', grinderId);
        if (error) throw error;
      } else {
        const [r1, r2] = await Promise.all([
          supabase.from('user_grinders').update({ is_default: false }).eq('user_id', user.id),
          supabase
            .from('user_grinders')
            .update({ is_default: true })
            .eq('user_id', user.id)
            .eq('grinder_id', grinderId),
        ]);
        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
      }
    } catch (e) {
      Sentry.captureException(e, {
        tags: { feature: 'set-default', kind: 'grinder' },
        extra: { grinderId, userId: user.id, isAlreadyDefault },
      });
      // Revert optimistic update
      await fetchEquipment();
      Alert.alert('Error', 'Failed to update default grinder. Please try again.');
    }
  }

  async function toggleDefaultMachine(machineId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isAlreadyDefault =
      machines.find((m) => m.brew_machine_id === machineId)?.is_default ?? false;

    haptics.medium();
    // Optimistic update
    setMachines((prev) =>
      isAlreadyDefault
        ? prev.map((m) => (m.brew_machine_id === machineId ? { ...m, is_default: false } : m))
        : prev.map((m) => ({ ...m, is_default: m.brew_machine_id === machineId })),
    );

    try {
      if (isAlreadyDefault) {
        const { error } = await supabase
          .from('user_brew_machines')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('brew_machine_id', machineId);
        if (error) throw error;
      } else {
        const [r1, r2] = await Promise.all([
          supabase.from('user_brew_machines').update({ is_default: false }).eq('user_id', user.id),
          supabase
            .from('user_brew_machines')
            .update({ is_default: true })
            .eq('user_id', user.id)
            .eq('brew_machine_id', machineId),
        ]);
        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
      }
    } catch (e) {
      Sentry.captureException(e, {
        tags: { feature: 'set-default', kind: 'machine' },
        extra: { machineId, userId: user.id, isAlreadyDefault },
      });
      // Revert optimistic update
      await fetchEquipment();
      Alert.alert('Error', 'Failed to update default machine. Please try again.');
    }
  }

  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <ScrollView
        className={`flex-1 px-4 ${Platform.OS === 'web' || isWide ? 'pt-8' : 'pt-16'}`}
        contentContainerClassName="pb-32"
        contentContainerStyle={
          Platform.OS === 'web' || isWide
            ? { maxWidth: 800, alignSelf: 'center', width: '100%' }
            : undefined
        }
      >
        {/* Header */}
        <Text className="text-latte-950 dark:text-latte-100 text-2xl mb-1 font-display-bold">
          My Gear
        </Text>
        <Text className="text-latte-600 dark:text-latte-500 text-sm mb-5">
          The grinders and machines you use.
        </Text>

        {loadingEquipment ? (
          <GearSkeleton isWide={isWide} />
        ) : equipmentError ? (
          <Text className="text-red-400 text-sm text-center mt-8">{equipmentError}</Text>
        ) : (
          <>
            <View className={isWide ? 'flex-row gap-6 mb-8' : ''}>
              {/* Grinders */}
              <View className={isWide ? 'flex-1' : 'mb-8'}>
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
                      <View key={grinder_id}>
                        <TouchableOpacity
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
                                <Text className="text-latte-500 dark:text-latte-600 text-xl">
                                  ⚙
                                </Text>
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
                                <Text className="text-latte-500 dark:text-latte-600 text-lg">
                                  ×
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => router.push(`/grinder/${grinder_id}`)}
                          className="flex-row items-center gap-1 px-1 pb-2 -mt-1"
                        >
                          <Text className="text-harvest-400 text-xs">Dial-In Guide</Text>
                          <Text className="text-harvest-400 text-xs">›</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {grinders.some((g) => g.is_default) && (
                      <Text className="text-latte-500 dark:text-latte-600 text-xs px-1 mt-1">
                        ★ Pre-selected when creating a brew
                      </Text>
                    )}
                  </>
                )}
              </View>

              {/* Machines */}
              <View className={isWide ? 'flex-1' : 'mb-8'}>
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
                        ★ Pre-selected when creating a brew
                      </Text>
                    )}
                  </>
                )}
              </View>
            </View>
            {/* end isWide row */}
          </>
        )}

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

function GearSkeleton({ isWide }: { isWide: boolean }) {
  return (
    <View className={isWide ? 'flex-row gap-6 mb-8' : ''}>
      <SkeletonSection title="Grinders" isWide={isWide} />
      <SkeletonSection title="Brew Machines" isWide={isWide} />
    </View>
  );
}

function SkeletonSection({ title, isWide }: { title: string; isWide: boolean }) {
  return (
    <View className={isWide ? 'flex-1' : 'mb-8'}>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-latte-800 dark:text-latte-200 text-lg font-semibold">{title}</Text>
        <Text className="text-harvest-400 font-semibold text-sm opacity-50">+ Add</Text>
      </View>
      {[0, 1].map((i) => (
        <View
          key={i}
          className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5 mb-2"
        >
          <View className="flex-row items-center gap-3 flex-1">
            <Skeleton
              className="bg-oat-200 dark:bg-ristretto-700"
              style={{ width: 48, height: 48, borderRadius: 8 }}
            />
            <View className="flex-1 gap-2">
              <Skeleton
                className="bg-oat-200 dark:bg-ristretto-700 rounded"
                style={{ height: 14, width: '70%' }}
              />
              <Skeleton
                className="bg-oat-200 dark:bg-ristretto-700 rounded"
                style={{ height: 10, width: '45%' }}
              />
            </View>
          </View>
          <Skeleton
            className="bg-oat-200 dark:bg-ristretto-700 rounded-full"
            style={{ height: 18, width: 18 }}
          />
        </View>
      ))}
    </View>
  );
}
