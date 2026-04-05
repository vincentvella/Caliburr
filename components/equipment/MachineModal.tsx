import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { supabase } from '@/lib/supabase';
import type { BrewMachine, MachineType } from '@/lib/types';
import { MACHINE_TYPE_LABELS } from '@/lib/types';
import { ModalRow as Row } from './ModalRow';

const VERIFICATION_THRESHOLD = 5;

type ModalView = 'search' | 'create' | 'review' | 'view';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  existingIds: string[];
}

export function MachineModal({ visible, onClose, onAdded, existingIds }: Props) {
  const [view, setView] = useState<ModalView>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BrewMachine[]>([]);
  const [defaults, setDefaults] = useState<BrewMachine[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<BrewMachine | null>(null);
  const [verificationCount, setVerificationCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      setView('search');
      setQuery('');
      setResults([]);
      supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
    }
  }, [visible]);

  // Load defaults: verified first, then most recent
  useEffect(() => {
    async function loadDefaults() {
      let q = supabase
        .from('brew_machines')
        .select('*')
        .order('verified', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(25);
      if (existingIds.length) q = q.not('id', 'in', `(${existingIds.join(',')})`);
      const { data } = await q;
      setDefaults((data as BrewMachine[]) ?? []);
    }
    loadDefaults();
  }, [existingIds]);

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
    setView('search');
    setQuery('');
    setResults([]);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-ristretto-900"
      >
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-ristretto-700">
          <Text className="text-latte-100 text-xl font-bold">{titles[view]}</Text>
          <TouchableOpacity onPress={rightAction}>
            <Text className="text-harvest-400 font-semibold">{rightLabel}</Text>
          </TouchableOpacity>
        </View>

        {view === 'search' && (
          <View className="flex-1 px-6 pt-4">
            <TextInput
              className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base mb-4"
              style={{ lineHeight: undefined }}
              placeholder="Search brand or model..."
              placeholderTextColor="#6e5a47"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {searching ? (
              <ActivityIndicator color="#ff9d37" style={{ marginTop: 16 }} />
            ) : (
              <FlatList
                data={query.trim() ? results : defaults}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  !query.trim() && defaults.length > 0 ? (
                    <Text className="text-latte-600 text-xs mb-2">Popular machines</Text>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => openMachine(item)}
                    className="flex-row items-center justify-between py-4 border-b border-ristretto-800"
                  >
                    <View>
                      <Text className="text-latte-100 font-medium">
                        {item.brand} {item.model}
                      </Text>
                      <Text className="text-latte-500 text-xs mt-0.5">
                        {MACHINE_TYPE_LABELS[item.machine_type]}
                      </Text>
                    </View>
                    {item.verified ? (
                      <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5">
                        <Text className="text-bloom-400 text-xs">Verified</Text>
                      </View>
                    ) : currentUserId && item.created_by === currentUserId ? (
                      <Text className="text-latte-600 text-xs">Add →</Text>
                    ) : (
                      <Text className="text-latte-600 text-xs">Review →</Text>
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
                      <Text className="text-latte-300">{`Add "${query}" as new machine`}</Text>
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
      <View className="bg-bloom-900 border border-bloom-700 rounded-xl px-4 py-3">
        <Text className="text-bloom-400 text-sm font-medium">✓ Community verified</Text>
      </View>

      {machine.image_url ? (
        <Image
          source={{ uri: machine.image_url }}
          className="w-full h-48 rounded-xl bg-ristretto-800"
          resizeMode="contain"
        />
      ) : null}

      <View className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-4 gap-3">
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
    </ScrollView>
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

  const form = useForm({
    defaultValues: {
      brand: reviewMachine?.brand ?? initialBrand,
      model: reviewMachine?.model ?? '',
      machine_type: reviewMachine?.machine_type ?? ('' as string),
      image_url: reviewMachine?.image_url ?? '',
    },
    onSubmit: async ({ value }) => {
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

      let machine: BrewMachine;

      if (isReview) {
        // Update details if anything changed, then record this user's verification
        const { data, error } = await supabase
          .from('brew_machines')
          .update(payload)
          .eq('id', reviewMachine.id)
          .select()
          .single();
        if (error || !data) return;
        machine = data as BrewMachine;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('machine_verifications')
            .upsert(
              { brew_machine_id: machine.id, user_id: user.id },
              { onConflict: 'brew_machine_id,user_id', ignoreDuplicates: true },
            );
        }
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('brew_machines')
          .insert({ ...payload, created_by: user?.id ?? null })
          .select()
          .single();
        if (error || !data) return;
        machine = data as BrewMachine;
      }

      onDone(machine);
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
        <View className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3 gap-2">
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
          <Text className="text-latte-500 text-xs">
            {verificationCount === 0
              ? `Be the first to confirm these details — ${VERIFICATION_THRESHOLD} confirmations needed to verify`
              : remaining === 0
                ? 'Fully confirmed by the community'
                : `${verificationCount} of ${VERIFICATION_THRESHOLD} confirmed · ${remaining} more needed`}
          </Text>
        </View>
      )}

      <View className="gap-1">
        <Text className="text-latte-400 text-xs px-1">
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
            <Text className="text-latte-400 text-xs px-1 mb-1">Brand</Text>
            <TextInput
              className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
              style={{ lineHeight: undefined }}
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
            <Text className="text-latte-400 text-xs px-1 mb-1">Model</Text>
            <TextInput
              className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
              style={{ lineHeight: undefined }}
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
            <Text className="text-latte-400 text-xs px-1">Machine Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {MACHINE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => field.setValue(field.state.value === type ? '' : type)}
                  className={`px-4 py-3 rounded-xl border ${
                    field.state.value === type
                      ? 'bg-harvest-500 border-harvest-500'
                      : 'border-ristretto-700'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${field.state.value === type ? 'text-white' : 'text-latte-400'}`}
                  >
                    {MACHINE_TYPE_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </form.Field>

      {/* Image URL */}
      <form.Field name="image_url">
        {(field) => (
          <View className="gap-1">
            <Text className="text-latte-400 text-xs px-1 mb-1">
              Image URL <Text className="text-latte-600">(optional)</Text>
            </Text>
            {field.state.value ? (
              <Image
                source={{ uri: field.state.value }}
                className="w-full h-40 rounded-xl mb-2 bg-ristretto-800"
                resizeMode="contain"
              />
            ) : null}
            <TextInput
              className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
              style={{ lineHeight: undefined }}
              placeholder="https://..."
              placeholderTextColor="#6e5a47"
              autoCapitalize="none"
              keyboardType="url"
              value={field.state.value}
              onChangeText={field.handleChange}
            />
            <Text className="text-latte-600 text-xs px-1">
              Only link to images you have rights to use.
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
