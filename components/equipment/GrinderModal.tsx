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
import { useState, useEffect, useCallback } from 'react';
import { useForm } from '@tanstack/react-form';
import { supabase } from '@/lib/supabase';
import type { Grinder } from '@/lib/types';
import { BURR_TYPE_LABELS, ADJUSTMENT_TYPE_LABELS } from '@/lib/types';

const VERIFICATION_THRESHOLD = 5;

type ModalView = 'search' | 'create' | 'edit' | 'review' | 'view';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  existingIds: string[];
  editGrinder?: Grinder;
}

export function GrinderModal({ visible, onClose, onAdded, existingIds, editGrinder }: Props) {
  const [view, setView] = useState<ModalView>(editGrinder ? 'edit' : 'search');
  const [query, setQuery] = useState('');
  const [defaults, setDefaults] = useState<Grinder[]>([]);
  const [results, setResults] = useState<Grinder[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedGrinder, setSelectedGrinder] = useState<Grinder | null>(null);
  const [verificationCount, setVerificationCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Reset view whenever the modal opens
  useEffect(() => {
    if (visible) {
      setView(editGrinder ? 'edit' : 'search');
      supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
    }
  }, [visible, editGrinder]);

  // Load default list: verified first, then most recent
  useEffect(() => {
    async function loadDefaults() {
      let q = supabase
        .from('grinders')
        .select('*')
        .order('verified', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(25);
      if (existingIds.length) q = q.not('id', 'in', `(${existingIds.join(',')})`);
      const { data } = await q;
      setDefaults((data as Grinder[]) ?? []);
    }
    loadDefaults();
  }, [existingIds]);

  const search = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      let q = supabase
        .from('grinders')
        .select('*')
        .or(`brand.ilike.%${text}%,model.ilike.%${text}%`);
      if (existingIds.length) q = q.not('id', 'in', `(${existingIds.join(',')})`);
      const { data } = await q.limit(10);
      setResults((data as Grinder[]) ?? []);
      setSearching(false);
    },
    [existingIds],
  );

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  async function openGrinder(grinder: Grinder) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Verified grinders are read-only
    if (grinder.verified) {
      setSelectedGrinder(grinder);
      setView('view');
      return;
    }

    // Creator can't verify their own entry — just add it directly
    if (user && grinder.created_by === user.id) {
      await handleAdd(grinder);
      return;
    }

    setSelectedGrinder(grinder);
    const { count } = await supabase
      .from('grinder_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('grinder_id', grinder.id);
    setVerificationCount(count ?? 0);
    setView('review');
  }

  async function handleAdd(grinder: Grinder) {
    setAddingId(grinder.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_grinders').insert({ user_id: user.id, grinder_id: grinder.id });
    }
    setAddingId(null);
    onAdded();
    handleClose();
  }

  function handleClose() {
    setView('search');
    setQuery('');
    setResults([]);
    setSelectedGrinder(null);
    onClose();
  }

  const titles: Record<ModalView, string> = {
    search: 'Add Grinder',
    create: 'New Grinder',
    edit: 'Edit Grinder',
    review: 'Confirm Details',
    view: 'Grinder Details',
  };
  const rightLabel = view === 'search' || view === 'edit' ? 'Cancel' : 'Back';
  const rightAction = view === 'search' || view === 'edit' ? handleClose : () => setView('search');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-ristretto-900">
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
                    <Text className="text-latte-600 text-xs mb-2">Popular grinders</Text>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => openGrinder(item)}
                    disabled={addingId === item.id}
                    className="flex-row items-center justify-between py-4 border-b border-ristretto-800">
                    <View>
                      <Text className="text-latte-100 font-medium">
                        {item.brand} {item.model}
                      </Text>
                      <Text className="text-latte-500 text-xs mt-0.5 capitalize">
                        {item.burr_type ?? '—'} · {item.adjustment_type ?? '—'}
                      </Text>
                    </View>
                    {addingId === item.id ? (
                      <ActivityIndicator size="small" color="#ff9d37" />
                    ) : item.verified ? (
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
                      className="flex-row items-center gap-3 py-4">
                      <View className="w-8 h-8 rounded-full bg-harvest-500 items-center justify-center">
                        <Text className="text-white font-bold text-lg">+</Text>
                      </View>
                      <Text className="text-latte-300">{`Add "${query}" as new grinder`}</Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
            )}
          </View>
        )}

        {view === 'create' && (
          <GrinderForm
            initialBrand={query}
            onDone={async (grinder) => {
              await handleAdd(grinder);
            }}
          />
        )}

        {view === 'review' && selectedGrinder && (
          <GrinderForm
            reviewGrinder={selectedGrinder}
            verificationCount={verificationCount}
            onDone={async (grinder) => {
              await handleAdd(grinder);
            }}
          />
        )}

        {view === 'view' && selectedGrinder && (
          <GrinderReadOnly
            grinder={selectedGrinder}
            addingId={addingId}
            onAdd={() => handleAdd(selectedGrinder)}
          />
        )}

        {view === 'edit' && editGrinder && (
          <GrinderForm
            editGrinder={editGrinder}
            onDone={() => {
              onAdded();
              handleClose();
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Read-only view for verified grinders ────────────────────────────────────

function GrinderReadOnly({
  grinder,
  addingId,
  onAdd,
}: {
  grinder: Grinder;
  addingId: string | null;
  onAdd: () => void;
}) {
  return (
    <ScrollView className="flex-1 px-6 pt-4" contentContainerClassName="gap-4 pb-8">
      <View className="bg-bloom-900 border border-bloom-700 rounded-xl px-4 py-3">
        <Text className="text-bloom-400 text-sm font-medium">✓ Community verified</Text>
      </View>

      {grinder.image_url ? (
        <Image
          source={{ uri: grinder.image_url }}
          className="w-full h-48 rounded-xl bg-ristretto-800"
          resizeMode="contain"
        />
      ) : null}

      <View className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-4 gap-3">
        <Row label="Brand" value={grinder.brand} />
        <Row label="Model" value={grinder.model} />
        {grinder.burr_type ? (
          <Row label="Burr Type" value={BURR_TYPE_LABELS[grinder.burr_type]} />
        ) : null}
        {grinder.adjustment_type ? (
          <Row label="Adjustment" value={ADJUSTMENT_TYPE_LABELS[grinder.adjustment_type]} />
        ) : null}
        {grinder.range_min != null && grinder.range_max != null ? (
          <Row label="Range" value={`${grinder.range_min} – ${grinder.range_max}`} />
        ) : null}
      </View>

      <TouchableOpacity
        onPress={onAdd}
        disabled={addingId === grinder.id}
        className="bg-harvest-500 rounded-xl py-4 items-center mt-2">
        {addingId === grinder.id ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Add to My Gear</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-latte-500 text-sm">{label}</Text>
      <Text className="text-latte-100 text-sm font-medium">{value}</Text>
    </View>
  );
}

// ─── Shared form (create + edit + review) ────────────────────────────────────

function GrinderForm({
  initialBrand = '',
  editGrinder,
  reviewGrinder,
  verificationCount = 0,
  onDone,
}: {
  initialBrand?: string;
  editGrinder?: Grinder;
  reviewGrinder?: Grinder;
  verificationCount?: number;
  onDone: (grinder: Grinder) => void;
}) {
  const isReview = !!reviewGrinder;
  const source = reviewGrinder ?? editGrinder;
  const BURR_TYPES = ['flat', 'conical', 'hybrid'] as const;
  const ADJ_TYPES = ['stepped', 'micro_stepped', 'stepless'] as const;
  const ADJ_LABELS: Record<string, string> = {
    stepped: 'Stepped',
    micro_stepped: 'Micro-stepped',
    stepless: 'Stepless',
  };

  const form = useForm({
    defaultValues: {
      brand: source?.brand ?? initialBrand,
      model: source?.model ?? '',
      burr_type: source?.burr_type ?? ('' as string),
      adjustment_type: source?.adjustment_type ?? ('' as string),
      steps_per_unit: source?.steps_per_unit != null ? String(source.steps_per_unit) : '',
      range_min: source?.range_min != null ? String(source.range_min) : '',
      range_max: source?.range_max != null ? String(source.range_max) : '',
      image_url: source?.image_url ?? '',
    },
    onSubmit: async ({ value }) => {
      const stepsPerUnit =
        value.adjustment_type === 'micro_stepped' && value.steps_per_unit
          ? parseInt(value.steps_per_unit, 10)
          : null;

      const payload = {
        brand: value.brand.trim(),
        model: value.model.trim(),
        burr_type: value.burr_type || null,
        adjustment_type: value.adjustment_type || null,
        steps_per_unit: stepsPerUnit,
        range_min: value.range_min ? parseFloat(value.range_min) : null,
        range_max: value.range_max ? parseFloat(value.range_max) : null,
        image_url: value.image_url.trim() || null,
      };

      if (isReview) {
        const { data, error } = await supabase
          .from('grinders')
          .update(payload)
          .eq('id', reviewGrinder!.id)
          .select()
          .single();
        if (error || !data) return;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('grinder_verifications')
            .upsert(
              { grinder_id: reviewGrinder!.id, user_id: user.id },
              { onConflict: 'grinder_id,user_id', ignoreDuplicates: true },
            );
        }
        onDone(data as Grinder);
      } else if (editGrinder) {
        const { data, error } = await supabase
          .from('grinders')
          .update(payload)
          .eq('id', editGrinder.id)
          .select()
          .single();
        if (!error && data) onDone(data as Grinder);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('grinders')
          .insert({ ...payload, created_by: user?.id ?? null })
          .select()
          .single();
        if (!error && data) onDone(data as Grinder);
      }
    },
  });

  const remaining = Math.max(0, VERIFICATION_THRESHOLD - verificationCount);
  const DOT_COUNT = VERIFICATION_THRESHOLD;

  return (
    <ScrollView
      className="flex-1 px-6 pt-4"
      contentContainerClassName="gap-3 pb-8"
      keyboardShouldPersistTaps="handled">
      {/* Verification progress banner (review mode only) */}
      {isReview && !reviewGrinder!.verified && (
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

      {isReview && reviewGrinder!.verified && (
        <View className="bg-bloom-900 border border-bloom-700 rounded-xl px-4 py-3">
          <Text className="text-bloom-400 text-sm font-medium">
            ✓ Community verified — confirm details are still correct
          </Text>
        </View>
      )}

      <form.Field
        name="brand"
        validators={{
          onBlur: ({ value }) => (!value.trim() ? 'Required' : undefined),
        }}>
        {(field) => (
          <View className="gap-1">
            <Text className="text-latte-400 text-xs px-1 mb-1">Brand</Text>
            <TextInput
              className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
              style={{ lineHeight: undefined }}
              placeholder="e.g. Niche"
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
              }}>
              {field.state.meta.errors[0] ?? ' '}
            </Text>
          </View>
        )}
      </form.Field>

      <form.Field
        name="model"
        validators={{
          onBlur: ({ value }) => (!value.trim() ? 'Required' : undefined),
        }}>
        {(field) => (
          <View className="gap-1">
            <Text className="text-latte-400 text-xs px-1 mb-1">Model</Text>
            <TextInput
              className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
              style={{ lineHeight: undefined }}
              placeholder="e.g. Zero"
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
              }}>
              {field.state.meta.errors[0] ?? ' '}
            </Text>
          </View>
        )}
      </form.Field>

      <form.Field name="burr_type">
        {(field) => (
          <View className="gap-2">
            <Text className="text-latte-400 text-xs px-1">Burr Type</Text>
            <View className="flex-row gap-2">
              {BURR_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => field.setValue(field.state.value === type ? '' : type)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    field.state.value === type
                      ? 'bg-harvest-500 border-harvest-500'
                      : 'border-ristretto-700'
                  }`}>
                  <Text
                    className={`text-sm font-medium capitalize ${field.state.value === type ? 'text-white' : 'text-latte-400'}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </form.Field>

      <form.Field name="adjustment_type">
        {(field) => (
          <View className="gap-2">
            <Text className="text-latte-400 text-xs px-1">Adjustment</Text>
            <View className="flex-row flex-wrap gap-2">
              {ADJ_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => field.setValue(field.state.value === type ? '' : type)}
                  className={`px-4 py-3 rounded-xl border items-center ${
                    field.state.value === type
                      ? 'bg-harvest-500 border-harvest-500'
                      : 'border-ristretto-700'
                  }`}>
                  <Text
                    className={`text-sm font-medium ${field.state.value === type ? 'text-white' : 'text-latte-400'}`}>
                    {ADJ_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.values.adjustment_type}>
        {(adjType) =>
          adjType ? (
            <View className="gap-3">
              {adjType === 'micro_stepped' && (
                <form.Field name="steps_per_unit">
                  {(field) => (
                    <View className="gap-1">
                      <Text className="text-latte-400 text-xs px-1 mb-1">
                        Steps per number{' '}
                        <Text className="text-latte-600">(e.g. 10 for 1Zpresso JX-Pro)</Text>
                      </Text>
                      <TextInput
                        className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
                        style={{ lineHeight: undefined }}
                        placeholder="10"
                        placeholderTextColor="#6e5a47"
                        keyboardType="number-pad"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                      />
                    </View>
                  )}
                </form.Field>
              )}

              <View className="gap-2">
                <Text className="text-latte-400 text-xs px-1">Range</Text>
                <View className="flex-row gap-3">
                  <form.Field name="range_min">
                    {(field) => (
                      <View className="flex-1 gap-1">
                        <Text className="text-latte-600 text-xs px-1">Min</Text>
                        <TextInput
                          className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
                          style={{ lineHeight: undefined }}
                          placeholder="0"
                          placeholderTextColor="#6e5a47"
                          keyboardType="decimal-pad"
                          value={field.state.value}
                          onChangeText={field.handleChange}
                        />
                      </View>
                    )}
                  </form.Field>
                  <form.Field name="range_max">
                    {(field) => (
                      <View className="flex-1 gap-1">
                        <Text className="text-latte-600 text-xs px-1">Max</Text>
                        <TextInput
                          className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
                          style={{ lineHeight: undefined }}
                          placeholder={
                            adjType === 'stepped' ? '40' : adjType === 'micro_stepped' ? '10' : '10'
                          }
                          placeholderTextColor="#6e5a47"
                          keyboardType="decimal-pad"
                          value={field.state.value}
                          onChangeText={field.handleChange}
                        />
                      </View>
                    )}
                  </form.Field>
                </View>
              </View>
            </View>
          ) : null
        }
      </form.Subscribe>

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

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <TouchableOpacity
            onPress={form.handleSubmit}
            disabled={isSubmitting}
            className="bg-harvest-500 rounded-xl py-4 items-center mt-2">
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">
                {isReview
                  ? 'Confirm & Add to My Gear'
                  : editGrinder
                    ? 'Save Changes'
                    : 'Add Grinder'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </form.Subscribe>
    </ScrollView>
  );
}
