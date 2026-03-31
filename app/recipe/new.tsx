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
import { useEffect, useState, useRef, useCallback } from "react";
import { router } from "expo-router";
import { useForm, useStore } from "@tanstack/react-form";
import { supabase } from "@/lib/supabase";
import {
  type Grinder,
  type BrewMachine,
  type BrewMethod,
  type RoastLevel,
  BREW_METHOD_LABELS,
  ROAST_LEVEL_LABELS,
} from "@/lib/types";
import { GrindTape } from "@/components/GrindTape";

const BREW_METHODS = Object.keys(BREW_METHOD_LABELS) as BrewMethod[];
const ROAST_LEVELS = Object.keys(ROAST_LEVEL_LABELS) as RoastLevel[];

export default function NewRecipeScreen() {
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [machines, setMachines] = useState<BrewMachine[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [grindersRes, machinesRes] = await Promise.all([
        supabase
          .from("user_grinders")
          .select("grinder:grinders(*)")
          .eq("user_id", user.id),
        supabase
          .from("user_brew_machines")
          .select("brew_machine:brew_machines(*)")
          .eq("user_id", user.id),
      ]);

      setGrinders(
        (grindersRes.data ?? []).map((r: any) => r.grinder) as Grinder[]
      );
      setMachines(
        (machinesRes.data ?? []).map((r: any) => r.brew_machine) as BrewMachine[]
      );
      setLoadingEquipment(false);
    }
    load();
  }, []);

  const form = useForm({
    defaultValues: {
      grinder_id: "",
      brew_machine_id: "",
      brew_method: "" as BrewMethod | "",
      grind_setting: "",
      dose_g: "",
      yield_g: "",
      brew_time_s: "",
      water_temp_c: "",
      ratio: "",
      roast_level: "" as RoastLevel | "",
      notes: "",
    },
    onSubmit: async ({ value }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("recipes").insert({
        user_id: user.id,
        grinder_id: value.grinder_id,
        brew_machine_id: value.brew_machine_id || null,
        brew_method: value.brew_method as BrewMethod,
        grind_setting: value.grind_setting.trim(),
        dose_g: value.dose_g ? parseFloat(value.dose_g) : null,
        yield_g: value.yield_g ? parseFloat(value.yield_g) : null,
        brew_time_s: value.brew_time_s ? parseInt(value.brew_time_s, 10) : null,
        water_temp_c: value.water_temp_c ? parseFloat(value.water_temp_c) : null,
        ratio: value.ratio ? parseFloat(value.ratio) : null,
        roast_level: value.roast_level || null,
        notes: value.notes.trim() || null,
      });

      if (!error) router.back();
      else form.setErrorMap({ onSubmit: error.message });
    },
  });

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
        <Text className="text-latte-100 text-lg font-bold">New Recipe</Text>
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
        ) : (
          <>
            {/* Grinder */}
            <form.Field
              name="grinder_id"
              validators={{ onSubmit: ({ value }) => !value ? "Select a grinder" : undefined }}
            >
              {(field) => (
                <View className="gap-2">
                  <SectionLabel label="Grinder" required />
                  {grinders.length === 0 ? (
                    <TouchableOpacity
                      onPress={() => router.back()}
                      className="border border-dashed border-ristretto-700 rounded-2xl py-5 items-center"
                    >
                      <Text className="text-latte-500 text-sm">Add grinders in your Profile first</Text>
                    </TouchableOpacity>
                  ) : (
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
                          {field.state.value === g.id && (
                            <Text className="text-white">✓</Text>
                          )}
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
                          {field.state.value === m.id && (
                            <Text className="text-white">✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </form.Field>
            )}

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

              {/* Dose + Yield → auto ratio */}
              <View className="flex-row gap-3">
                <form.Field name="dose_g">
                  {(field) => (
                    <View className="flex-1 gap-1">
                      <Text className="text-latte-400 text-xs px-1">Dose (g)</Text>
                      <TextInput
                        className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
                        style={{ lineHeight: undefined }}
                        placeholder="18"
                        placeholderTextColor="#6e5a47"
                        keyboardType="decimal-pad"
                        value={field.state.value}
                        onChangeText={(v) => {
                          field.handleChange(v);
                          const yield_g = form.getFieldValue("yield_g");
                          if (v && yield_g) {
                            const r = parseFloat(yield_g) / parseFloat(v);
                            if (!isNaN(r)) form.setFieldValue("ratio", r.toFixed(2));
                          }
                        }}
                      />
                    </View>
                  )}
                </form.Field>

                <form.Field name="yield_g">
                  {(field) => (
                    <View className="flex-1 gap-1">
                      <Text className="text-latte-400 text-xs px-1">Yield (g)</Text>
                      <TextInput
                        className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
                        style={{ lineHeight: undefined }}
                        placeholder="36"
                        placeholderTextColor="#6e5a47"
                        keyboardType="decimal-pad"
                        value={field.state.value}
                        onChangeText={(v) => {
                          field.handleChange(v);
                          const dose_g = form.getFieldValue("dose_g");
                          if (v && dose_g) {
                            const r = parseFloat(v) / parseFloat(dose_g);
                            if (!isNaN(r)) form.setFieldValue("ratio", r.toFixed(2));
                          }
                        }}
                      />
                    </View>
                  )}
                </form.Field>
              </View>

              {/* Ratio (auto or manual) */}
              <form.Field name="ratio">
                {(field) => {
                  const dose = form.getFieldValue("dose_g");
                  const yld = form.getFieldValue("yield_g");
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
                        onChangeText={field.handleChange}
                      />
                    </View>
                  );
                }}
              </form.Field>

              {/* Brew Timer */}
              <form.Field name="brew_time_s">
                {(field) => (
                  <View className="gap-1">
                    <Text className="text-latte-400 text-xs px-1">Brew Time</Text>
                    <BrewTimer
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  </View>
                )}
              </form.Field>

              {/* Temp */}
              <NumericField form={form} name="water_temp_c" label="Temp (°C)" placeholder="93" />
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
              {(err) =>
                err ? (
                  <Text style={{ color: "#f87171" }} className="text-sm">
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
    </KeyboardAvoidingView>
  );
}

function BrewTimer({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(value ? parseInt(value, 10) : 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    setElapsed(0);
    onChange("");
  }, [stop, onChange]);

  // Write to form when stopped with a non-zero value
  useEffect(() => {
    if (!running && elapsed > 0) onChange(String(elapsed));
  }, [running, elapsed, onChange]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <View className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3 gap-3">
      {/* Display */}
      <View className="items-center">
        <Text className="text-harvest-400 font-bold" style={{ fontSize: 48, letterSpacing: 2 }}>
          {mm}:{ss}
        </Text>
      </View>

      {/* Controls */}
      <View className="flex-row gap-2">
        {!running ? (
          <TouchableOpacity
            onPress={start}
            className="flex-1 bg-harvest-500 rounded-xl py-3 items-center"
          >
            <Text className="text-white font-semibold">{elapsed > 0 ? "Resume" : "Start"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={stop}
            className="flex-1 bg-ristretto-700 rounded-xl py-3 items-center"
          >
            <Text className="text-latte-100 font-semibold">Stop</Text>
          </TouchableOpacity>
        )}
        {elapsed > 0 && (
          <TouchableOpacity
            onPress={reset}
            className="px-5 border border-ristretto-700 rounded-xl py-3 items-center"
          >
            <Text className="text-latte-500 font-semibold">Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Manual override */}
      <View className="flex-row items-center gap-2">
        <Text className="text-latte-600 text-xs">or enter seconds manually:</Text>
        <TextInput
          className="flex-1 bg-ristretto-900 border border-ristretto-800 rounded-lg px-3 py-2 text-latte-300 text-sm"
          style={{ lineHeight: undefined }}
          placeholder="e.g. 28"
          placeholderTextColor="#4a3728"
          keyboardType="number-pad"
          value={elapsed > 0 ? String(elapsed) : ""}
          onChangeText={(v) => {
            const n = parseInt(v, 10);
            if (!isNaN(n)) { setElapsed(n); stop(); }
            else if (!v) { setElapsed(0); onChange(""); }
          }}
        />
      </View>
    </View>
  );
}

function GrindSettingField({ form, grinders }: { form: any; grinders: Grinder[] }) {
  const grinderId = useStore(form.store, (s: any) => s.values.grinder_id);
  const grinder = grinders.find((g) => g.id === grinderId);

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
      {label}
      {required && <Text className="text-harvest-500"> *</Text>}
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

function NumericField({
  form,
  name,
  label,
  placeholder,
}: {
  form: any;
  name: string;
  label: string;
  placeholder: string;
}) {
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
