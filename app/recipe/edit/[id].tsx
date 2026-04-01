import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useForm, useStore } from "@tanstack/react-form";
import { supabase } from "@/lib/supabase";
import {
  type Grinder,
  type BrewMachine,
  type Bean,
  type BrewMethod,
  type RoastLevel,
  type RecipeWithJoins,
  BREW_METHOD_LABELS,
  ROAST_LEVEL_LABELS,
} from "@/lib/types";
import { GrindTape } from "@/components/GrindTape";
import { BeanModal } from "@/components/BeanModal";

const BREW_METHODS = Object.keys(BREW_METHOD_LABELS) as BrewMethod[];
const ROAST_LEVELS = Object.keys(ROAST_LEVEL_LABELS) as RoastLevel[];

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<RecipeWithJoins | null>(null);
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [machines, setMachines] = useState<BrewMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBean, setSelectedBean] = useState<Bean | null>(null);
  const [beanModalOpen, setBeanModalOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      grinder_id:     "",
      brew_machine_id: "",
      bean_id:        "",
      brew_method:    "" as BrewMethod | "",
      grind_setting:  "",
      dose_g:         "",
      yield_g:        "",
      brew_time_s:    "",
      water_temp_c:   "",
      ratio:          "",
      roast_level:    "" as RoastLevel | "",
      roast_date:     "",
      notes:          "",
    },
    onSubmit: async ({ value }) => {
      if (!recipe) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Snapshot the current state into history before overwriting
      await supabase.from("recipe_history").insert({
        recipe_id:      recipe.id,
        edited_by:      user.id,
        grind_setting:  recipe.grind_setting,
        dose_g:         recipe.dose_g,
        yield_g:        recipe.yield_g,
        brew_time_s:    recipe.brew_time_s,
        water_temp_c:   recipe.water_temp_c,
        ratio:          recipe.ratio,
        roast_level:    recipe.roast_level,
        roast_date:     recipe.roast_date,
        notes:          recipe.notes,
        bean_id:        recipe.bean_id,
        brew_machine_id: recipe.brew_machine_id,
      });

      // 2. Apply the update
      const { error } = await supabase
        .from("recipes")
        .update({
          grinder_id:      value.grinder_id,
          brew_machine_id: value.brew_machine_id || null,
          bean_id:         value.bean_id || null,
          brew_method:     value.brew_method as BrewMethod,
          grind_setting:   value.grind_setting.trim(),
          dose_g:          value.dose_g ? parseFloat(value.dose_g) : null,
          yield_g:         value.yield_g ? parseFloat(value.yield_g) : null,
          brew_time_s:     value.brew_time_s ? parseInt(value.brew_time_s, 10) : null,
          water_temp_c:    value.water_temp_c ? parseFloat(value.water_temp_c) : null,
          ratio:           value.ratio ? parseFloat(value.ratio) : null,
          roast_level:     value.roast_level || null,
          roast_date:      value.roast_date || null,
          notes:           value.notes.trim() || null,
          updated_at:      new Date().toISOString(),
        })
        .eq("id", recipe.id)
        .eq("user_id", user.id);

      if (!error) router.back();
      else form.setErrorMap({ onSubmit: error.message });
    },
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [recipeRes, grindersRes, machinesRes] = await Promise.all([
        supabase
          .from("recipes")
          .select(`
            *,
            grinder:grinders(brand, model, verified, burr_type, adjustment_type),
            bean:beans(name, roaster, origin, process, roast_level),
            brew_machine:brew_machines(brand, model, machine_type, verified)
          `)
          .eq("id", id)
          .eq("user_id", user.id)
          .single(),
        supabase.from("user_grinders").select("grinder:grinders(*)").eq("user_id", user.id),
        supabase.from("user_brew_machines").select("brew_machine:brew_machines(*)").eq("user_id", user.id),
      ]);

      if (!recipeRes.data) { router.back(); return; }
      const r = recipeRes.data as RecipeWithJoins;
      setRecipe(r);

      const loadedGrinders = (grindersRes.data ?? []).map((g: any) => g.grinder) as Grinder[];
      const loadedMachines = (machinesRes.data ?? []).map((m: any) => m.brew_machine) as BrewMachine[];
      setGrinders(loadedGrinders);
      setMachines(loadedMachines);

      // Pre-populate form from existing recipe
      form.setFieldValue("grinder_id",      r.grinder_id);
      form.setFieldValue("brew_machine_id",  r.brew_machine_id ?? "");
      form.setFieldValue("bean_id",          r.bean_id ?? "");
      form.setFieldValue("brew_method",      r.brew_method);
      form.setFieldValue("grind_setting",    r.grind_setting);
      form.setFieldValue("dose_g",           r.dose_g?.toString() ?? "");
      form.setFieldValue("yield_g",          r.yield_g?.toString() ?? "");
      form.setFieldValue("brew_time_s",      r.brew_time_s?.toString() ?? "");
      form.setFieldValue("water_temp_c",     r.water_temp_c?.toString() ?? "");
      form.setFieldValue("ratio",            r.ratio?.toString() ?? "");
      form.setFieldValue("roast_level",      r.roast_level ?? "");
      form.setFieldValue("roast_date",       r.roast_date ?? "");
      form.setFieldValue("notes",            r.notes ?? "");

      if (r.bean) setSelectedBean({ id: r.bean_id!, ...(r.bean as any) });

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-ristretto-900 items-center justify-center">
        <ActivityIndicator color="#ff9d37" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-ristretto-900"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-ristretto-700">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-harvest-400 font-semibold">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-latte-100 text-lg font-bold">Edit Recipe</Text>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <TouchableOpacity onPress={form.handleSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? <ActivityIndicator size="small" color="#ff9d37" />
                : <Text className="text-harvest-400 font-semibold">Save</Text>
              }
            </TouchableOpacity>
          )}
        </form.Subscribe>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-6 pb-16 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Grinder */}
        <form.Field
          name="grinder_id"
          validators={{ onSubmit: ({ value }) => !value ? "Select a grinder" : undefined }}
        >
          {(field) => (
            <View className="gap-2">
              <SectionLabel label="Grinder" required />
              <View className="gap-2">
                {grinders.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => field.setValue(g.id)}
                    className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl border ${
                      field.state.value === g.id
                        ? "bg-harvest-500 border-harvest-500"
                        : "bg-ristretto-800 border-ristretto-700"
                    }`}
                  >
                    <Text className={`font-medium ${field.state.value === g.id ? "text-white" : "text-latte-100"}`}>
                      {g.brand} {g.model}
                    </Text>
                    {field.state.value === g.id && <Text className="text-white">✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              <FieldError errors={field.state.meta.errors} />
            </View>
          )}
        </form.Field>

        {/* Machine */}
        {machines.length > 0 && (
          <form.Field name="brew_machine_id">
            {(field) => (
              <View className="gap-2">
                <SectionLabel label="Machine" />
                <View className="gap-2">
                  {machines.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => field.setValue(field.state.value === m.id ? "" : m.id)}
                      className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl border ${
                        field.state.value === m.id
                          ? "bg-harvest-500 border-harvest-500"
                          : "bg-ristretto-800 border-ristretto-700"
                      }`}
                    >
                      <Text className={`font-medium ${field.state.value === m.id ? "text-white" : "text-latte-100"}`}>
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

        {/* Bean */}
        <form.Field name="bean_id">
          {(field) => (
            <View className="gap-2">
              <SectionLabel label="Bean" />
              {selectedBean ? (
                <View className="flex-row items-center justify-between bg-ristretto-800 border border-ristretto-700 rounded-2xl px-4 py-3.5">
                  <View className="flex-1">
                    <Text className="text-latte-100 font-medium">{selectedBean.name}</Text>
                    <Text className="text-latte-500 text-xs mt-0.5">{selectedBean.roaster}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedBean(null); field.setValue(""); }}>
                    <Text className="text-latte-600 text-lg">×</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setBeanModalOpen(true)}
                  className="border border-dashed border-ristretto-700 rounded-2xl py-4 items-center"
                >
                  <Text className="text-latte-500 text-sm">+ Add bean (optional)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </form.Field>

        {/* Brew Method */}
        <form.Field
          name="brew_method"
          validators={{ onSubmit: ({ value }) => !value ? "Select a brew method" : undefined }}
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
                        ? "bg-harvest-500 border-harvest-500"
                        : "border-ristretto-700"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${field.state.value === method ? "text-white" : "text-latte-400"}`}>
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
        <GrindSettingField form={form} grinders={grinders} />

        {/* Parameters */}
        <View className="gap-4">
          <SectionLabel label="Parameters" />
          <View className="flex-row gap-3">
            <NumericField form={form} name="dose_g" label="Dose (g)" placeholder="18" />
            <NumericField form={form} name="yield_g" label="Yield (g)" placeholder="36" />
          </View>
          <form.Field name="ratio">
            {(field) => {
              const dose = form.getFieldValue("dose_g");
              const yld  = form.getFieldValue("yield_g");
              const isAuto = !!(dose && yld && field.state.value);
              return (
                <View className="gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-latte-400 text-xs px-1">Ratio (1:X)</Text>
                    {isAuto && (
                      <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5">
                        <Text className="text-bloom-400 text-xs">auto</Text>
                      </View>
                    )}
                  </View>
                  <TextInput
                    className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
                    style={{ lineHeight: undefined }}
                    placeholder="16"
                    placeholderTextColor="#6e5a47"
                    keyboardType="decimal-pad"
                    value={field.state.value}
                    onChangeText={(v) => {
                      field.handleChange(v);
                      const d = form.getFieldValue("dose_g");
                      const y = form.getFieldValue("yield_g");
                      if (v && d) form.setFieldValue("yield_g", (parseFloat(v) * parseFloat(d)).toFixed(1));
                    }}
                  />
                </View>
              );
            }}
          </form.Field>
          <NumericField form={form} name="water_temp_c" label="Temp (°C)" placeholder="93" />
          <NumericField form={form} name="brew_time_s" label="Brew Time (s)" placeholder="28" />
        </View>

        {/* Roast */}
        <form.Field name="roast_level">
          {(field) => (
            <View className="gap-2">
              <SectionLabel label="Roast Level" />
              <View className="flex-row flex-wrap gap-2">
                {ROAST_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => field.setValue(field.state.value === level ? "" : level)}
                    className={`px-4 py-2.5 rounded-full border ${
                      field.state.value === level
                        ? "bg-harvest-500 border-harvest-500"
                        : "border-ristretto-700"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${field.state.value === level ? "text-white" : "text-latte-400"}`}>
                      {ROAST_LEVEL_LABELS[level]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </form.Field>

        {/* Notes */}
        <form.Field name="notes">
          {(field) => (
            <View className="gap-1">
              <SectionLabel label="Notes" />
              <TextInput
                className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
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

        <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
          {(err) => err ? <Text style={{ color: "#f87171" }} className="text-sm">{String(err)}</Text> : null}
        </form.Subscribe>

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <TouchableOpacity
              onPress={form.handleSubmit}
              disabled={isSubmitting}
              className="bg-harvest-500 rounded-2xl py-4 items-center"
            >
              {isSubmitting
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-semibold text-base">Save Changes</Text>
              }
            </TouchableOpacity>
          )}
        </form.Subscribe>
      </ScrollView>

      <BeanModal
        visible={beanModalOpen}
        onClose={() => setBeanModalOpen(false)}
        onSelected={(bean) => {
          setSelectedBean(bean);
          form.setFieldValue("bean_id", bean.id);
          setBeanModalOpen(false);
        }}
        selectedId={selectedBean?.id}
      />
    </KeyboardAvoidingView>
  );
}

function GrindSettingField({ form, grinders }: { form: any; grinders: Grinder[] }) {
  const grinderId = useStore(form.store, (s: any) => s.values.grinder_id);
  const grinder   = grinders.find((g) => g.id === grinderId);
  const prevGrinderIdRef = useRef<string>("");

  useEffect(() => {
    if (grinderId && grinderId !== prevGrinderIdRef.current && prevGrinderIdRef.current !== "") {
      form.setFieldValue("grind_setting", "");
    }
    prevGrinderIdRef.current = grinderId ?? "";
  }, [grinderId]);

  return (
    <form.Field
      name="grind_setting"
      validators={{ onSubmit: ({ value }: { value: string }) => !value.trim() ? "Required" : undefined }}
    >
      {(field: any) => (
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
  );
}

function SectionLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text className="text-latte-300 font-semibold text-sm">
      {label}{required && <Text className="text-harvest-500"> *</Text>}
    </Text>
  );
}

function FieldError({ errors }: { errors: (string | undefined)[] }) {
  return (
    <Text className="text-xs px-1" style={{ color: "#f87171", opacity: errors.length > 0 ? 1 : 0 }}>
      {errors[0] ?? " "}
    </Text>
  );
}

function NumericField({ form, name, label, placeholder }: { form: any; name: string; label: string; placeholder: string }) {
  return (
    <form.Field name={name}>
      {(field: any) => (
        <View className="flex-1 gap-1">
          <Text className="text-latte-400 text-xs px-1">{label}</Text>
          <TextInput
            className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
            style={{ lineHeight: undefined }}
            placeholder={placeholder}
            placeholderTextColor="#6e5a47"
            keyboardType="decimal-pad"
            value={field.state.value}
            onChangeText={field.handleChange}
          />
        </View>
      )}
    </form.Field>
  );
}
