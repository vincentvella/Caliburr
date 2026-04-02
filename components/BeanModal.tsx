import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { supabase } from '@/lib/supabase';
import type { Bean, RoastLevel } from '@/lib/types';
import { ROAST_LEVEL_LABELS } from '@/lib/types';
import { Constants } from '@/lib/database.types';

const ROAST_LEVELS = [...Constants.public.Enums.roast_level];

type ModalView = 'search' | 'create';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelected: (bean: Bean) => void;
  selectedId?: string | null;
}

export function BeanModal({ visible, onClose, onSelected, selectedId }: Props) {
  const [view, setView] = useState<ModalView>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Bean[]>([]);
  const [defaults, setDefaults] = useState<Bean[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      setView('search');
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    async function loadDefaults() {
      const { data } = await supabase
        .from('beans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);
      setDefaults(data ?? []);
    }
    loadDefaults();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      const { data } = await supabase
        .from('beans')
        .select('*')
        .or(`name.ilike.%${query}%,roaster.ilike.%${query}%`)
        .limit(15);
      setResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function handleClose() {
    setView('search');
    setQuery('');
    setResults([]);
    onClose();
  }

  const titles: Record<ModalView, string> = {
    search: 'Select Bean',
    create: 'New Bean',
  };

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
          <TouchableOpacity onPress={view === 'search' ? handleClose : () => setView('search')}>
            <Text className="text-harvest-400 font-semibold">
              {view === 'search' ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>

        {view === 'search' && (
          <View className="flex-1 px-6 pt-4">
            <TextInput
              className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base mb-4"
              style={{ lineHeight: undefined }}
              placeholder="Search bean or roaster..."
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
                    <Text className="text-latte-600 text-xs mb-2">Recent beans</Text>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      onSelected(item);
                      handleClose();
                    }}
                    className={`flex-row items-center justify-between py-4 border-b border-ristretto-800 ${
                      selectedId === item.id ? 'opacity-60' : ''
                    }`}
                  >
                    <View className="flex-1 mr-3">
                      <Text className="text-latte-100 font-medium">{item.name}</Text>
                      <Text className="text-latte-500 text-xs mt-0.5">
                        {item.roaster}
                        {item.origin ? ` · ${item.origin}` : ''}
                        {item.roast_level ? ` · ${ROAST_LEVEL_LABELS[item.roast_level]}` : ''}
                      </Text>
                    </View>
                    {selectedId === item.id && <Text className="text-harvest-400">✓</Text>}
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
                      <Text className="text-latte-300">Add &quot;{query}&quot; as new bean</Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
            )}
          </View>
        )}

        {view === 'create' && (
          <BeanForm
            initialName={query}
            onDone={(bean) => {
              onSelected(bean);
              handleClose();
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

function BeanForm({
  initialName = '',
  onDone,
}: {
  initialName?: string;
  onDone: (bean: Bean) => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      name: initialName,
      roaster: '',
      origin: '',
      process: '',
      roast_level: '' as RoastLevel | '',
    },
    onSubmit: async ({ value }) => {
      const { data, error } = await supabase
        .from('beans')
        .insert({
          name: value.name.trim(),
          roaster: value.roaster.trim(),
          origin: value.origin.trim() || null,
          process: value.process.trim() || null,
          roast_level: value.roast_level || null,
        })
        .select()
        .single();

      if (error || !data) {
        setSubmitError(error?.message ?? 'Failed to save');
        return;
      }
      onDone(data);
    },
  });

  return (
    <ScrollView
      className="flex-1 px-6 pt-4"
      contentContainerClassName="gap-3 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      <form.Field
        name="name"
        validators={{ onBlur: ({ value }) => (!value.trim() ? 'Required' : undefined) }}
      >
        {(field) => (
          <FormField field={field} label="Name" placeholder="e.g. Ethiopia Yirgacheffe" required />
        )}
      </form.Field>
      <form.Field
        name="roaster"
        validators={{ onBlur: ({ value }) => (!value.trim() ? 'Required' : undefined) }}
      >
        {(field) => (
          <FormField field={field} label="Roaster" placeholder="e.g. Blue Bottle" required />
        )}
      </form.Field>
      <form.Field name="origin">
        {(field) => <FormField field={field} label="Origin" placeholder="e.g. Ethiopia" />}
      </form.Field>
      <form.Field name="process">
        {(field) => <FormField field={field} label="Process" placeholder="e.g. Washed, Natural" />}
      </form.Field>

      {/* Roast level */}
      <form.Field name="roast_level">
        {(field) => (
          <View className="gap-2">
            <Text className="text-latte-400 text-xs px-1">
              Roast Level <Text className="text-latte-600">(optional)</Text>
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ROAST_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => field.setValue(field.state.value === level ? '' : level)}
                  className={`px-3 py-2.5 rounded-xl border ${
                    field.state.value === level
                      ? 'bg-harvest-500 border-harvest-500'
                      : 'border-ristretto-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${field.state.value === level ? 'text-white' : 'text-latte-400'}`}
                  >
                    {ROAST_LEVEL_LABELS[level]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </form.Field>

      {submitError && (
        <Text style={{ color: '#f87171' }} className="text-sm">
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
              <Text className="text-white font-semibold">Add Bean</Text>
            )}
          </TouchableOpacity>
        )}
      </form.Subscribe>
    </ScrollView>
  );
}

type StringFieldApi = {
  state: { value: string; meta: { errors: (string | undefined)[] } };
  handleChange: (v: string) => void;
  handleBlur: () => void;
};

function FormField({
  field,
  label,
  placeholder,
  required,
}: {
  field: StringFieldApi;
  label: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <View className="gap-1">
      <Text className="text-latte-400 text-xs px-1 mb-1">
        {label}
        {!required && <Text className="text-latte-600"> (optional)</Text>}
      </Text>
      <TextInput
        className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
        style={{ lineHeight: undefined }}
        placeholder={placeholder}
        placeholderTextColor="#6e5a47"
        value={field.state.value}
        onChangeText={field.handleChange}
        onBlur={field.handleBlur}
      />
      <Text
        className="text-xs px-1"
        style={{ color: '#f87171', opacity: field.state.meta.errors.length > 0 ? 1 : 0 }}
      >
        {field.state.meta.errors[0] ?? ' '}
      </Text>
    </View>
  );
}
