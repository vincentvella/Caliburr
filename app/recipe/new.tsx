import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, useStore } from '@tanstack/react-form';
import { supabase } from '@/lib/supabase';
import { haptics } from '@/lib/haptics';
import {
  type Grinder,
  type BrewMachine,
  type BrewMethod,
  type RoastLevel,
  BREW_METHOD_LABELS,
  ROAST_LEVEL_LABELS,
} from '@/lib/types';
import { Constants } from '@/lib/database.types';
import { GrindTape } from '@/components/GrindTape';
import { BeanModal } from '@/components/BeanModal';
import { DateInput } from '@/components/DateInput';
import { BrewTimer } from '@/components/BrewTimer';
import {
  SectionLabel,
  FieldError,
  validateNum,
  validateDate,
} from '@/components/recipe/FormHelpers';

const BREW_METHODS = [...Constants.public.Enums.brew_method];
const ROAST_LEVELS = [...Constants.public.Enums.roast_level];

type AnyForm = { setFieldValue: (field: any, value: any) => void };

function useLoadNewRecipe(form: AnyForm, templateId: string | undefined) {
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [machines, setMachines] = useState<BrewMachine[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [selectedBean, setSelectedBean] = useState<{
    id: string;
    name: string;
    roaster: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setEquipmentError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [userGrindersRes, userMachinesRes] = await Promise.all([
          supabase.from('user_grinders').select('grinder_id, is_default').eq('user_id', user.id),
          supabase
            .from('user_brew_machines')
            .select('brew_machine_id, is_default')
            .eq('user_id', user.id),
        ]);

        const grinderIds = (userGrindersRes.data ?? []).map((r) => r.grinder_id);
        const machineIds = (userMachinesRes.data ?? []).map((r) => r.brew_machine_id);

        const [grindersRes, machinesRes, grinderEditsRes, machineEditsRes] = await Promise.all([
          supabase.from('grinders').select('*').in('id', grinderIds),
          supabase.from('brew_machines').select('*').in('id', machineIds),
          grinderIds.length
            ? supabase
                .from('grinder_edits')
                .select('grinder_id, payload')
                .in('grinder_id', grinderIds)
                .eq('status', 'pending')
            : Promise.resolve({ data: [] }),
          machineIds.length
            ? supabase
                .from('machine_edits')
                .select('machine_id, payload')
                .in('machine_id', machineIds)
                .eq('status', 'pending')
            : Promise.resolve({ data: [] }),
        ]);

        const pendingGrinderEdits = new Map(
          (grinderEditsRes.data ?? []).map((e) => [e.grinder_id, e.payload as Partial<Grinder>]),
        );
        const pendingMachineEdits = new Map(
          (machineEditsRes.data ?? []).map((e) => [
            e.machine_id,
            e.payload as Partial<BrewMachine>,
          ]),
        );

        setGrinders(
          (grindersRes.data ?? []).map((g) => ({ ...g, ...pendingGrinderEdits.get(g.id) })),
        );
        setMachines(
          (machinesRes.data ?? []).map((m) => ({ ...m, ...pendingMachineEdits.get(m.id) })),
        );

        const defaultGrinderRow = (userGrindersRes.data ?? []).find((r) => r.is_default);
        if (defaultGrinderRow) form.setFieldValue('grinder_id', defaultGrinderRow.grinder_id);

        const defaultMachineRow = (userMachinesRes.data ?? []).find((r) => r.is_default);
        if (defaultMachineRow)
          form.setFieldValue('brew_machine_id', defaultMachineRow.brew_machine_id);

        if (templateId) {
          const { data: tpl } = await supabase
            .from('recipes')
            .select('*, bean:beans(id, name, roaster)')
            .eq('id', templateId)
            .single();

          if (tpl) {
            form.setFieldValue('brew_method', tpl.brew_method);
            form.setFieldValue('grind_setting', tpl.grind_setting);
            form.setFieldValue('dose_g', tpl.dose_g?.toString() ?? '');
            form.setFieldValue('yield_g', tpl.yield_g?.toString() ?? '');
            form.setFieldValue('brew_time_s', tpl.brew_time_s?.toString() ?? '');
            form.setFieldValue('water_temp_c', tpl.water_temp_c?.toString() ?? '');
            form.setFieldValue('ratio', tpl.ratio?.toString() ?? '');
            form.setFieldValue('roast_level', tpl.roast_level ?? '');
            form.setFieldValue('notes', tpl.notes ?? '');

            if (tpl.grinder_id && grinderIds.includes(tpl.grinder_id)) {
              form.setFieldValue('grinder_id', tpl.grinder_id);
            }
            if (tpl.brew_machine_id && machineIds.includes(tpl.brew_machine_id)) {
              form.setFieldValue('brew_machine_id', tpl.brew_machine_id);
            }
            if (tpl.bean && tpl.bean_id) {
              form.setFieldValue('bean_id', tpl.bean_id);
              setSelectedBean({ id: tpl.bean_id, name: tpl.bean.name, roaster: tpl.bean.roaster });
            }
          }
        }

        setLoadingEquipment(false);
      } catch (e) {
        setEquipmentError(e instanceof Error ? e.message : 'Something went wrong');
        setLoadingEquipment(false);
      }
    }
    load();
  }, [form, templateId]);

  return { grinders, machines, loadingEquipment, equipmentError, selectedBean, setSelectedBean };
}

function useResetGrindOnGrinderChange(grinderId: string, form: AnyForm) {
  const prevGrinderIdRef = useRef('');
  useEffect(() => {
    if (grinderId && grinderId !== prevGrinderIdRef.current) {
      form.setFieldValue('grind_setting', '');
    }
    prevGrinderIdRef.current = grinderId ?? '';
  }, [grinderId, form]);
}

export default function NewRecipeScreen() {
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const [beanModalOpen, setBeanModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      grinder_id: '',
      brew_machine_id: '',
      bean_id: '',
      brew_method: '' as BrewMethod | '',
      grind_setting: '',
      dose_g: '',
      yield_g: '',
      brew_time_s: '',
      water_temp_c: '',
      ratio: '',
      roast_level: '' as RoastLevel | '',
      roast_date: '',
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      if (!value.brew_method) return;

      const { error } = await supabase.from('recipes').insert({
        user_id: user.id,
        grinder_id: value.grinder_id,
        brew_machine_id: value.brew_machine_id || null,
        bean_id: value.bean_id || null,
        brew_method: value.brew_method,
        grind_setting: value.grind_setting.trim(),
        dose_g: value.dose_g ? parseFloat(value.dose_g) : null,
        yield_g: value.yield_g ? parseFloat(value.yield_g) : null,
        brew_time_s: value.brew_time_s ? parseInt(value.brew_time_s, 10) : null,
        water_temp_c: value.water_temp_c ? parseFloat(value.water_temp_c) : null,
        ratio: value.ratio ? parseFloat(value.ratio) : null,
        roast_level: value.roast_level || null,
        roast_date: value.roast_date || null,
        notes: value.notes.trim() || null,
      });

      if (!error) {
        haptics.success();
        router.back();
      } else {
        haptics.error();
        setSubmitError(error.message);
      }
    },
  });

  const { grinders, machines, loadingEquipment, equipmentError, selectedBean, setSelectedBean } =
    useLoadNewRecipe(form, templateId);

  const grinderId = useStore(form.store, (s) => s.values.grinder_id);
  const grinder = grinders.find((g) => g.id === grinderId) ?? null;

  useResetGrindOnGrinderChange(grinderId, form);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-latte-50 dark:bg-ristretto-900"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-harvest-400 font-semibold">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 text-lg font-bold">
          {templateId ? 'Clone Recipe' : 'New Recipe'}
        </Text>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <TouchableOpacity onPress={form.handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ff9d37" />
              ) : (
                <Text className="text-harvest-400 font-semibold">Save</Text>
              )}
            </TouchableOpacity>
          )}
        </form.Subscribe>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-6 pb-16 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        {loadingEquipment ? (
          <ActivityIndicator color="#ff9d37" />
        ) : equipmentError ? (
          <Text className="text-red-400 text-sm text-center">{equipmentError}</Text>
        ) : (
          <>
            {/* Grinder */}
            <form.Field
              name="grinder_id"
              validators={{
                onSubmit: ({ value }) => (!value ? 'Select a grinder' : undefined),
              }}
            >
              {(field) => (
                <View className="gap-2">
                  <SectionLabel label="Grinder" required />
                  {grinders.length === 0 ? (
                    <TouchableOpacity
                      onPress={() => router.back()}
                      className="border border-dashed border-latte-300 dark:border-ristretto-700 rounded-2xl py-5 items-center"
                    >
                      <Text className="text-latte-600 dark:text-latte-500 text-sm">
                        Add grinders in your Profile first
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="gap-2">
                      {grinders.map((g) => (
                        <TouchableOpacity
                          key={g.id}
                          onPress={() => field.setValue(g.id)}
                          className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl border ${
                            field.state.value === g.id
                              ? 'bg-harvest-500 border-harvest-500'
                              : 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700'
                          }`}
                        >
                          <Text
                            className={`font-medium ${field.state.value === g.id ? 'text-white' : 'text-latte-950 dark:text-latte-100'}`}
                          >
                            {g.brand} {g.model}
                          </Text>
                          {field.state.value === g.id && <Text className="text-white">✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <FieldError errors={field.state.meta.errors} />
                </View>
              )}
            </form.Field>

            {/* Machine (optional) */}
            {machines.length > 0 && (
              <form.Field name="brew_machine_id">
                {(field) => (
                  <View className="gap-2">
                    <SectionLabel label="Machine" />
                    <View className="gap-2">
                      {machines.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => field.setValue(field.state.value === m.id ? '' : m.id)}
                          className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl border ${
                            field.state.value === m.id
                              ? 'bg-harvest-500 border-harvest-500'
                              : 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700'
                          }`}
                        >
                          <Text
                            className={`font-medium ${field.state.value === m.id ? 'text-white' : 'text-latte-950 dark:text-latte-100'}`}
                          >
                            {m.brand} {m.model}
                          </Text>
                          {field.state.value === m.id && <Text className="text-white">✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </form.Field>
            )}

            {/* Bean (optional) */}
            <form.Field name="bean_id">
              {(field) => (
                <View className="gap-2">
                  <SectionLabel label="Bean" />
                  {selectedBean ? (
                    <View className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 py-3.5">
                      <View className="flex-1">
                        <Text className="text-latte-950 dark:text-latte-100 font-medium">
                          {selectedBean.name}
                        </Text>
                        <Text className="text-latte-600 dark:text-latte-500 text-xs mt-0.5">
                          {selectedBean.roaster}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedBean(null);
                          field.setValue('');
                        }}
                      >
                        <Text className="text-latte-500 dark:text-latte-600 text-lg">×</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setBeanModalOpen(true)}
                      className="border border-dashed border-latte-300 dark:border-ristretto-700 rounded-2xl py-4 items-center"
                    >
                      <Text className="text-latte-600 dark:text-latte-500 text-sm">
                        + Add bean (optional)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </form.Field>

            {/* Brew Method */}
            <form.Field
              name="brew_method"
              validators={{
                onSubmit: ({ value }) => (!value ? 'Select a brew method' : undefined),
              }}
            >
              {(field) => (
                <View className="gap-2">
                  <SectionLabel label="Brew Method" required />
                  <View className="flex-row flex-wrap gap-2">
                    {BREW_METHODS.map((method) => (
                      <TouchableOpacity
                        key={method}
                        onPress={() => field.setValue(method)}
                        className={`px-4 py-2.5 rounded-full border ${
                          field.state.value === method
                            ? 'bg-harvest-500 border-harvest-500'
                            : 'border-latte-200 dark:border-ristretto-700'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${field.state.value === method ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
                        >
                          {BREW_METHOD_LABELS[method]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <FieldError errors={field.state.meta.errors} />
                </View>
              )}
            </form.Field>

            {/* Grind Setting */}
            <form.Field
              name="grind_setting"
              validators={{
                onSubmit: ({ value }) => (!value.trim() ? 'Required' : undefined),
              }}
            >
              {(field) => (
                <View className="gap-2">
                  <SectionLabel label="Grind Setting" required />
                  <GrindTape
                    value={field.state.value}
                    onChange={field.handleChange}
                    adjustmentType={grinder?.adjustment_type ?? null}
                    stepsPerUnit={grinder?.steps_per_unit}
                    rangeMin={grinder?.range_min}
                    rangeMax={grinder?.range_max}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </View>
              )}
            </form.Field>

            {/* Parameters */}
            <View className="gap-4">
              <SectionLabel label="Parameters" />

              {/* Dose + Yield → auto ratio */}
              <View className="flex-row gap-3">
                <form.Field
                  name="dose_g"
                  validators={{ onSubmit: ({ value }) => validateNum(value) }}
                >
                  {(field) => (
                    <View className="flex-1 gap-1">
                      <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">
                        Dose (g)
                      </Text>
                      <TextInput
                        className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                        style={{ lineHeight: undefined }}
                        placeholder="18"
                        placeholderTextColor="#6e5a47"
                        keyboardType="decimal-pad"
                        value={field.state.value}
                        onChangeText={(v) => {
                          field.handleChange(v);
                          const yield_g = form.getFieldValue('yield_g');
                          if (v && yield_g) {
                            const r = parseFloat(yield_g) / parseFloat(v);
                            if (!isNaN(r)) form.setFieldValue('ratio', r.toFixed(2));
                          }
                        }}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </View>
                  )}
                </form.Field>

                <form.Field
                  name="yield_g"
                  validators={{ onSubmit: ({ value }) => validateNum(value) }}
                >
                  {(field) => (
                    <View className="flex-1 gap-1">
                      <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">
                        Yield (g)
                      </Text>
                      <TextInput
                        className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                        style={{ lineHeight: undefined }}
                        placeholder="36"
                        placeholderTextColor="#6e5a47"
                        keyboardType="decimal-pad"
                        value={field.state.value}
                        onChangeText={(v) => {
                          field.handleChange(v);
                          const dose_g = form.getFieldValue('dose_g');
                          if (v && dose_g) {
                            const r = parseFloat(v) / parseFloat(dose_g);
                            if (!isNaN(r)) form.setFieldValue('ratio', r.toFixed(2));
                          }
                        }}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </View>
                  )}
                </form.Field>
              </View>

              {/* Ratio (auto or manual) */}
              <form.Field name="ratio" validators={{ onSubmit: ({ value }) => validateNum(value) }}>
                {(field) => {
                  const dose = form.getFieldValue('dose_g');
                  const yld = form.getFieldValue('yield_g');
                  const isAuto = !!(dose && yld && field.state.value);
                  return (
                    <View className="gap-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">
                          Ratio (1:X)
                        </Text>
                        {isAuto && (
                          <View className="bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700 rounded-full px-2 py-0.5">
                            <Text className="text-bloom-700 dark:text-bloom-400 text-xs">auto</Text>
                          </View>
                        )}
                      </View>
                      <TextInput
                        className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                        style={{ lineHeight: undefined }}
                        placeholder="16"
                        placeholderTextColor="#6e5a47"
                        keyboardType="decimal-pad"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </View>
                  );
                }}
              </form.Field>

              {/* Brew Timer */}
              <form.Field name="brew_time_s">
                {(field) => (
                  <View className="gap-1">
                    <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">
                      Brew Time
                    </Text>
                    <BrewTimer value={field.state.value} onChange={field.handleChange} />
                  </View>
                )}
              </form.Field>

              {/* Temp */}
              <form.Field
                name="water_temp_c"
                validators={{ onSubmit: ({ value }) => validateNum(value) }}
              >
                {(field) => (
                  <View className="gap-1">
                    <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">
                      Temp (°C)
                    </Text>
                    <TextInput
                      className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                      style={{ lineHeight: undefined }}
                      placeholder="93"
                      placeholderTextColor="#6e5a47"
                      keyboardType="decimal-pad"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </View>
                )}
              </form.Field>
            </View>

            {/* Roast Level */}
            <form.Field name="roast_level">
              {(field) => (
                <View className="gap-2">
                  <SectionLabel label="Roast Level" />
                  <View className="flex-row flex-wrap gap-2">
                    {ROAST_LEVELS.map((level) => (
                      <TouchableOpacity
                        key={level}
                        onPress={() => field.setValue(field.state.value === level ? '' : level)}
                        className={`px-4 py-2.5 rounded-full border ${
                          field.state.value === level
                            ? 'bg-harvest-500 border-harvest-500'
                            : 'border-latte-200 dark:border-ristretto-700'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${field.state.value === level ? 'text-white' : 'text-latte-700 dark:text-latte-400'}`}
                        >
                          {ROAST_LEVEL_LABELS[level]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </form.Field>

            {/* Roast Date */}
            <form.Field
              name="roast_date"
              validators={{ onSubmit: ({ value }) => validateDate(value) }}
            >
              {(field) => (
                <View className="gap-1">
                  <DateInput
                    label="Roast Date"
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </View>
              )}
            </form.Field>

            {/* Notes */}
            <form.Field name="notes">
              {(field) => (
                <View className="gap-1">
                  <SectionLabel label="Notes" />
                  <TextInput
                    className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
                    style={{ lineHeight: undefined }}
                    placeholder="Tasting notes, tips, adjustments..."
                    placeholderTextColor="#6e5a47"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                  />
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
                  className="bg-harvest-500 rounded-2xl py-4 items-center"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-base">Save Recipe</Text>
                  )}
                </TouchableOpacity>
              )}
            </form.Subscribe>
          </>
        )}
      </ScrollView>

      <BeanModal
        visible={beanModalOpen}
        onClose={() => setBeanModalOpen(false)}
        onSelected={(bean) => {
          setSelectedBean({ id: bean.id, name: bean.name, roaster: bean.roaster });
          form.setFieldValue('bean_id', bean.id);
          setBeanModalOpen(false);
        }}
        selectedId={selectedBean?.id}
      />
    </KeyboardAvoidingView>
  );
}
