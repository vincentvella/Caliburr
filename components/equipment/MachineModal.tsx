import { textInputStyle } from '@/lib/styles';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { LegendList } from '@legendapp/list';
import { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@/hooks/useQuery';
import { unwrap } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import type { Json } from '@/lib/database.types';
import type { BrewMachine, MachineType } from '@/lib/types';
import { MACHINE_TYPE_LABELS } from '@/lib/types';
import { ModalRow as Row } from './ModalRow';
import { promptReport } from '@/lib/report';
import { pickAndUploadImage } from '@/lib/uploadImage';

const VERIFICATION_THRESHOLD = 5;

type ModalView = 'search' | 'create' | 'review' | 'view';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  existingIds: string[];
}

function useMachineModal(visible: boolean) {
  const [view, setView] = useState<ModalView>('search');
  const [query, setQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setView('search');
      setQuery('');
      supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
    }
  }, [visible]);

  return { view, setView, query, setQuery, currentUserId };
}

function useMachineDefaults(existingIds: string[]) {
  const { data, error } = useQuery(async () => {
    let q = supabase
      .from('brew_machines')
      .select('*')
      .order('verified', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(25);
    if (existingIds.length) q = q.not('id', 'in', `(${existingIds.join(',')})`);
    return unwrap(await q) as BrewMachine[];
  }, [existingIds]);
  return { defaults: data ?? [], error };
}

function useMachineSearch(query: string, existingIds: string[]) {
  const [results, setResults] = useState<BrewMachine[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      let q = supabase
        .from('brew_machines')
        .select('*')
        .or(`brand.ilike.%${query}%,model.ilike.%${query}%`);
      if (existingIds.length) q = q.not('id', 'in', `(${existingIds.join(',')})`);
      const { data } = await q.limit(10);
      setResults((data as BrewMachine[]) ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, existingIds]);

  return { results, searching };
}

export function MachineModal({ visible, onClose, onAdded, existingIds }: Props) {
  const { view, setView, query, setQuery, currentUserId } = useMachineModal(visible);
  const [selectedMachine, setSelectedMachine] = useState<BrewMachine | null>(null);
  const [verificationCount, setVerificationCount] = useState(0);
  const [adding, setAdding] = useState(false);

  const { defaults } = useMachineDefaults(existingIds);
  const { results, searching } = useMachineSearch(query, existingIds);

  async function openMachine(machine: BrewMachine) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Verified machines are read-only
    if (machine.verified) {
      setSelectedMachine(machine);
      setView('view');
      return;
    }

    // Creator can't verify their own entry — just add it directly
    if (user && machine.created_by === user.id) {
      await handleAdd(machine);
      return;
    }

    setSelectedMachine(machine);
    const { count } = await supabase
      .from('machine_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('brew_machine_id', machine.id);
    setVerificationCount(count ?? 0);
    setView('review');
  }

  async function handleAdd(machine: BrewMachine) {
    setAdding(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_brew_machines')
        .insert({ user_id: user.id, brew_machine_id: machine.id });
    }
    setAdding(false);
    onAdded();
    handleClose();
  }

  function handleClose() {
    setQuery('');
    setSelectedMachine(null);
    onClose();
  }

  const titles: Record<ModalView, string> = {
    search: 'Add Machine',
    create: 'New Machine',
    review: 'Confirm Details',
    view: 'Machine Details',
  };

  const rightLabel = view === 'search' ? 'Cancel' : 'Back';
  const rightAction = view === 'search' ? handleClose : () => setView('search');

  const isWeb = Platform.OS === 'web';

  return (
    <Modal
      visible={visible}
      animationType={isWeb ? 'fade' : 'slide'}
      presentationStyle={isWeb ? 'overFullScreen' : 'pageSheet'}
      transparent={isWeb}
      onRequestClose={handleClose}
    >
      {isWeb ? (
        <Pressable
          onPress={handleClose}
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-latte-50 dark:bg-ristretto-900 rounded-2xl overflow-hidden w-full"
            style={{ maxWidth: 560, maxHeight: '85%' }}
          >
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-latte-200 dark:border-ristretto-700">
              <Text className="text-latte-950 dark:text-latte-100 text-xl font-bold">
                {titles[view]}
              </Text>
              <TouchableOpacity onPress={rightAction}>
                <Text className="text-harvest-400 font-semibold">{rightLabel}</Text>
              </TouchableOpacity>
            </View>

            {view === 'search' && (
              <View className="flex-1 px-6 pt-4" style={{ minHeight: 400 }}>
                <TextInput
                  className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base mb-4"
                  placeholder="Search brand or model..."
                  placeholderTextColor="#6e5a47"
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                />
                {searching ? (
                  <ActivityIndicator color="#ff9d37" style={{ marginTop: 16 }} />
                ) : (
                  <ScrollView keyboardShouldPersistTaps="handled">
                    {!query.trim() && defaults.length > 0 && (
                      <Text className="text-latte-500 dark:text-latte-600 text-xs mb-2">
                        Popular machines
                      </Text>
                    )}
                    {(query.trim() ? results : defaults).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => openMachine(item)}
                        className="flex-row items-center justify-between py-4 border-b border-latte-100 dark:border-ristretto-800"
                      >
                        <View>
                          <Text className="text-latte-950 dark:text-latte-100 font-medium">
                            {item.brand} {item.model}
                          </Text>
                          <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5">
                            {MACHINE_TYPE_LABELS[item.machine_type]}
                          </Text>
                        </View>
                        {item.verified ? (
                          <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-full px-2 py-0.5">
                            <Text className="text-bloom-700 dark:text-bloom-400 text-xs">
                              Verified
                            </Text>
                          </View>
                        ) : currentUserId && item.created_by === currentUserId ? (
                          <Text className="text-latte-500 dark:text-latte-600 text-xs">Add →</Text>
                        ) : (
                          <Text className="text-latte-500 dark:text-latte-600 text-xs">
                            Review →
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                    {!!query.trim() && results.length === 0 && (
                      <TouchableOpacity
                        onPress={() => setView('create')}
                        className="flex-row items-center gap-3 py-4"
                      >
                        <View className="w-8 h-8 rounded-full bg-harvest-500 items-center justify-center">
                          <Text className="text-white font-bold text-lg">+</Text>
                        </View>
                        <Text className="text-latte-700 dark:text-latte-300">{`Add "${query}" as new machine`}</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}
              </View>
            )}
            {view === 'create' && (
              <MachineForm initialBrand={query} onDone={async (m) => await handleAdd(m)} />
            )}
            {view === 'review' && selectedMachine && (
              <MachineForm
                reviewMachine={selectedMachine}
                verificationCount={verificationCount}
                onDone={async (m) => await handleAdd(m)}
              />
            )}
            {view === 'view' && selectedMachine && (
              <MachineReadOnly
                machine={selectedMachine}
                adding={adding}
                onAdd={() => handleAdd(selectedMachine)}
              />
            )}
          </Pressable>
        </Pressable>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-latte-50 dark:bg-ristretto-900"
        >
          <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-latte-200 dark:border-ristretto-700">
            <Text className="text-latte-950 dark:text-latte-100 text-xl font-bold">
              {titles[view]}
            </Text>
            <TouchableOpacity onPress={rightAction}>
              <Text className="text-harvest-400 font-semibold">{rightLabel}</Text>
            </TouchableOpacity>
          </View>

          {view === 'search' && (
            <View className="flex-1 px-6 pt-4">
              <TextInput
                className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base mb-4"
                style={textInputStyle}
                placeholder="Search brand or model..."
                placeholderTextColor="#6e5a47"
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {searching ? (
                <ActivityIndicator color="#ff9d37" style={{ marginTop: 16 }} />
              ) : (
                <LegendList
                  data={query.trim() ? results : defaults}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={
                    !query.trim() && defaults.length > 0 ? (
                      <Text className="text-latte-500 dark:text-latte-600 text-xs mb-2">
                        Popular machines
                      </Text>
                    ) : null
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => openMachine(item)}
                      className="flex-row items-center justify-between py-4 border-b border-latte-100 dark:border-ristretto-800"
                    >
                      <View>
                        <Text className="text-latte-950 dark:text-latte-100 font-medium">
                          {item.brand} {item.model}
                        </Text>
                        <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5">
                          {MACHINE_TYPE_LABELS[item.machine_type]}
                        </Text>
                      </View>
                      {item.verified ? (
                        <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-full px-2 py-0.5">
                          <Text className="text-bloom-700 dark:text-bloom-400 text-xs">
                            Verified
                          </Text>
                        </View>
                      ) : currentUserId && item.created_by === currentUserId ? (
                        <Text className="text-latte-500 dark:text-latte-600 text-xs">Add →</Text>
                      ) : (
                        <Text className="text-latte-500 dark:text-latte-600 text-xs">Review →</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    query.trim() ? (
                      <TouchableOpacity
                        onPress={() => setView('create')}
                        className="flex-row items-center gap-3 py-4"
                      >
                        <View className="w-8 h-8 rounded-full bg-harvest-500 items-center justify-center">
                          <Text className="text-white font-bold text-lg">+</Text>
                        </View>
                        <Text className="text-latte-700 dark:text-latte-300">{`Add "${query}" as new machine`}</Text>
                      </TouchableOpacity>
                    ) : null
                  }
                />
              )}
            </View>
          )}

          {view === 'create' && (
            <MachineForm
              initialBrand={query}
              onDone={async (machine) => {
                await handleAdd(machine);
              }}
            />
          )}

          {view === 'review' && selectedMachine && (
            <MachineForm
              reviewMachine={selectedMachine}
              verificationCount={verificationCount}
              onDone={async (machine) => {
                await handleAdd(machine);
              }}
            />
          )}

          {view === 'view' && selectedMachine && (
            <MachineReadOnly
              machine={selectedMachine}
              adding={adding}
              onAdd={() => handleAdd(selectedMachine)}
            />
          )}
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

// ─── Read-only view for verified machines ────────────────────────────────────

function MachineReadOnly({
  machine,
  adding,
  onAdd,
}: {
  machine: BrewMachine;
  adding: boolean;
  onAdd: () => void;
}) {
  return (
    <ScrollView className="flex-1 px-6 pt-4" contentContainerClassName="gap-4 pb-8">
      <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-xl px-4 py-3">
        <Text className="text-bloom-700 dark:text-bloom-400 text-sm font-medium">
          ✓ Community verified
        </Text>
      </View>

      {machine.image_url && machine.image_status === 'approved' ? (
        <Image
          source={{ uri: machine.image_url }}
          className="w-full h-48 rounded-xl bg-oat-100 dark:bg-ristretto-800"
          resizeMode="contain"
        />
      ) : null}

      <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-4 gap-3">
        <Row label="Brand" value={machine.brand} />
        <Row label="Model" value={machine.model} />
        <Row label="Type" value={MACHINE_TYPE_LABELS[machine.machine_type]} />
      </View>

      <TouchableOpacity
        onPress={onAdd}
        disabled={adding}
        className="bg-harvest-500 rounded-xl py-4 items-center mt-2"
      >
        {adding ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Add to My Gear</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => promptReport('machine', machine.id)}
        className="items-center py-3"
      >
        <Text className="text-latte-400 dark:text-latte-700 text-xs">Report incorrect data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function machinePayloadChanged(
  current: BrewMachine,
  payload: { brand: string; model: string; machine_type: MachineType; image_url: string | null },
): boolean {
  return (
    payload.brand !== current.brand ||
    payload.model !== current.model ||
    payload.machine_type !== current.machine_type ||
    payload.image_url !== (current.image_url ?? null)
  );
}

// ─── Shared form (create + review) ───────────────────────────────────────────

function MachineForm({
  initialBrand = '',
  reviewMachine,
  verificationCount = 0,
  onDone,
}: {
  initialBrand?: string;
  reviewMachine?: BrewMachine;
  verificationCount?: number;
  onDone: (machine: BrewMachine) => void;
}) {
  const MACHINE_TYPES = Object.keys(MACHINE_TYPE_LABELS) as MachineType[];
  const isReview = !!reviewMachine;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm({
    defaultValues: {
      brand: reviewMachine?.brand ?? initialBrand,
      model: reviewMachine?.model ?? '',
      machine_type: reviewMachine?.machine_type ?? ('' as string),
      image_url: reviewMachine?.image_url ?? '',
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      if (!value.machine_type) {
        form.setErrorMap({ onSubmit: { fields: { machine_type: 'Select a machine type' } } });
        return;
      }

      const payload = {
        brand: value.brand.trim(),
        model: value.model.trim(),
        machine_type: value.machine_type as MachineType,
        image_url: value.image_url.trim() || null,
      };

      try {
        let machine: BrewMachine;

        if (isReview) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (machinePayloadChanged(reviewMachine, payload)) {
            const edit = unwrap<{ id: string }>(
              await supabase
                .from('machine_edits')
                .insert({
                  machine_id: reviewMachine.id,
                  proposed_by: user?.id ?? null,
                  payload: payload as Json,
                })
                .select('id')
                .single(),
            );

            // Fire-and-forget email notification
            supabase.functions
              .invoke('notify-equipment-edit', {
                body: {
                  editType: 'machine',
                  equipmentName: `${reviewMachine.brand} ${reviewMachine.model}`,
                  payload,
                  editId: edit.id,
                },
              })
              .then(({ error }) => {
                if (error) {
                  Sentry.captureException(error, {
                    tags: { feature: 'notify-equipment-edit', kind: 'machine' },
                    extra: { editId: edit.id, machineId: reviewMachine.id },
                  });
                }
              });
          } else {
            if (user) {
              await supabase
                .from('machine_verifications')
                .upsert(
                  { brew_machine_id: reviewMachine.id, user_id: user.id },
                  { onConflict: 'brew_machine_id,user_id', ignoreDuplicates: true },
                );
            }
          }

          machine = reviewMachine;
        } else {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          machine = unwrap(
            await supabase
              .from('brew_machines')
              .insert({
                ...payload,
                image_status: payload.image_url ? ('pending' as const) : null,
                created_by: user?.id ?? null,
              })
              .select()
              .single(),
          ) as BrewMachine;
        }

        haptics.success();
        onDone(machine);
      } catch (e) {
        Sentry.captureException(e, {
          tags: { feature: 'machine-form-submit', mode: isReview ? 'review' : 'create' },
        });
        haptics.error();
        setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
      }
    },
  });

  const remaining = Math.max(0, VERIFICATION_THRESHOLD - verificationCount);
  const DOT_COUNT = VERIFICATION_THRESHOLD;

  return (
    <ScrollView
      className="flex-1 px-6 pt-4"
      contentContainerClassName="gap-3 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      {/* Verification progress banner */}
      {isReview && (
        <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3 gap-2">
          <View className="flex-row gap-1.5">
            {Array.from({ length: DOT_COUNT }, (_, i) => (
              <View
                key={i}
                className="flex-1 rounded-full"
                style={{
                  height: 4,
                  backgroundColor: i < verificationCount ? '#22c55e' : '#3a2a1c',
                }}
              />
            ))}
          </View>
          <Text className="text-latte-600 dark:text-latte-500 text-xs">
            {verificationCount === 0
              ? `Be the first to confirm these details — ${VERIFICATION_THRESHOLD} confirmations needed to verify`
              : remaining === 0
                ? 'Fully confirmed by the community'
                : `${verificationCount} of ${VERIFICATION_THRESHOLD} confirmed · ${remaining} more needed`}
          </Text>
        </View>
      )}

      <View className="gap-1">
        <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">
          {isReview
            ? 'Review and correct any details below, then confirm.'
            : 'Fill in the machine details.'}
        </Text>
      </View>

      {/* Brand */}
      <form.Field
        name="brand"
        validators={{
          onBlur: ({ value }) => (!value.trim() ? 'Required' : undefined),
        }}
      >
        {(field) => (
          <View className="gap-1">
            <Text className="text-latte-700 dark:text-latte-400 text-xs px-1 mb-1">Brand</Text>
            <TextInput
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
              style={textInputStyle}
              placeholder="e.g. La Marzocco"
              placeholderTextColor="#6e5a47"
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

      {/* Model */}
      <form.Field
        name="model"
        validators={{
          onBlur: ({ value }) => (!value.trim() ? 'Required' : undefined),
        }}
      >
        {(field) => (
          <View className="gap-1">
            <Text className="text-latte-700 dark:text-latte-400 text-xs px-1 mb-1">Model</Text>
            <TextInput
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
              style={textInputStyle}
              placeholder="e.g. Linea Mini"
              placeholderTextColor="#6e5a47"
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

      {/* Machine type */}
      <form.Field name="machine_type">
        {(field) => (
          <View className="gap-2">
            <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">Machine Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {MACHINE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => field.setValue(field.state.value === type ? '' : type)}
                  className={`px-4 py-3 rounded-xl border ${
                    field.state.value === type
                      ? 'bg-harvest-500 border-harvest-500'
                      : 'border-latte-200 dark:border-ristretto-700'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${field.state.value === type ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
                  >
                    {MACHINE_TYPE_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </form.Field>

      {/* Photo */}
      <form.Field name="image_url">
        {(field) => (
          <View className="gap-2">
            <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">
              Photo <Text className="text-latte-500 dark:text-latte-600">(optional)</Text>
            </Text>
            {field.state.value ? (
              <View>
                <Image
                  source={{ uri: field.state.value }}
                  className="w-full h-40 rounded-xl bg-oat-100 dark:bg-ristretto-800"
                  resizeMode="contain"
                />
                <TouchableOpacity
                  onPress={() => field.setValue('')}
                  className="absolute top-2 right-2 bg-ristretto-900/70 rounded-full w-7 h-7 items-center justify-center"
                >
                  <Text className="text-white text-xs font-bold">✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={async () => {
                  setUploading(true);
                  const url = await pickAndUploadImage('machines');
                  if (url) field.setValue(url);
                  setUploading(false);
                }}
                disabled={uploading}
                className="bg-oat-100 dark:bg-ristretto-800 border border-dashed border-latte-300 dark:border-ristretto-600 rounded-xl py-8 items-center justify-center gap-2"
              >
                {uploading ? (
                  <ActivityIndicator color="#ff9d37" />
                ) : (
                  <>
                    <Text className="text-2xl">📷</Text>
                    <Text className="text-latte-600 dark:text-latte-400 text-sm">
                      Choose from library
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <Text className="text-latte-500 dark:text-latte-600 text-xs px-1">
              Only submit images you have the right to share.
            </Text>
          </View>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
        {(err) =>
          err ? (
            <Text style={{ color: '#f87171' }} className="text-sm">
              {String(err)}
            </Text>
          ) : null
        }
      </form.Subscribe>

      {submitError && (
        <Text style={{ color: '#f87171' }} className="text-sm px-1">
          {submitError}
        </Text>
      )}

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <TouchableOpacity
            onPress={form.handleSubmit}
            disabled={isSubmitting}
            className="bg-harvest-500 rounded-xl py-4 items-center mt-2"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">
                {isReview ? 'Confirm & Add to My Gear' : 'Add Machine'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </form.Subscribe>
    </ScrollView>
  );
}
