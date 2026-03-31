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
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "@tanstack/react-form";
import { supabase } from "@/lib/supabase";
import type { Grinder } from "@/lib/types";

type ModalView = "search" | "create" | "edit";

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  existingIds: string[];
  editGrinder?: Grinder;
}

export function GrinderModal({ visible, onClose, onAdded, existingIds, editGrinder }: Props) {
  const [view, setView] = useState<ModalView>(editGrinder ? "edit" : "search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Grinder[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Reset view whenever the modal opens
  useEffect(() => {
    if (visible) setView(editGrinder ? "edit" : "search");
  }, [visible, editGrinder]);

  const search = useCallback(async (text: string) => {
    if (!text.trim()) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("grinders")
      .select("*")
      .or(`brand.ilike.%${text}%,model.ilike.%${text}%`)
      .not("id", "in", existingIds.length ? `(${existingIds.join(",")})` : "(null)")
      .limit(10);
    setResults((data as Grinder[]) ?? []);
    setSearching(false);
  }, [existingIds]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  async function handleAdd(grinder: Grinder) {
    setAddingId(grinder.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_grinders").insert({ user_id: user.id, grinder_id: grinder.id });
    }
    setAddingId(null);
    onAdded();
    handleClose();
  }

  function handleClose() {
    setView("search");
    setQuery("");
    setResults([]);
    onClose();
  }

  const title = view === "edit" ? "Edit Grinder" : view === "create" ? "New Grinder" : "Add Grinder";
  const rightLabel = view === "create" ? "Back" : "Cancel";
  const rightAction = view === "create" ? () => setView("search") : handleClose;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-ristretto-900">
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-ristretto-700">
          <Text className="text-latte-100 text-xl font-bold">{title}</Text>
          <TouchableOpacity onPress={rightAction}>
            <Text className="text-harvest-400 font-semibold">{rightLabel}</Text>
          </TouchableOpacity>
        </View>

        {view === "search" && (
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
                data={results}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleAdd(item)}
                    disabled={addingId === item.id}
                    className="flex-row items-center justify-between py-4 border-b border-ristretto-800"
                  >
                    <View>
                      <Text className="text-latte-100 font-medium">{item.brand} {item.model}</Text>
                      <Text className="text-latte-500 text-xs mt-0.5 capitalize">
                        {item.burr_type ?? "—"} · {item.adjustment_type ?? "—"}
                      </Text>
                    </View>
                    {addingId === item.id ? (
                      <ActivityIndicator size="small" color="#ff9d37" />
                    ) : item.verified ? (
                      <View className="bg-bloom-900 border border-bloom-700 rounded-full px-2 py-0.5">
                        <Text className="text-bloom-400 text-xs">Verified</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  query.trim() ? (
                    <TouchableOpacity
                      onPress={() => setView("create")}
                      className="flex-row items-center gap-3 py-4"
                    >
                      <View className="w-8 h-8 rounded-full bg-harvest-500 items-center justify-center">
                        <Text className="text-white font-bold text-lg">+</Text>
                      </View>
                      <Text className="text-latte-300">Add "{query}" as new grinder</Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
            )}
          </View>
        )}

        {view === "create" && (
          <GrinderForm
            initialBrand={query}
            onDone={async (grinder) => { await handleAdd(grinder); }}
          />
        )}

        {view === "edit" && editGrinder && (
          <GrinderForm
            editGrinder={editGrinder}
            onDone={() => { onAdded(); handleClose(); }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function GrinderForm({
  initialBrand = "",
  editGrinder,
  onDone,
}: {
  initialBrand?: string;
  editGrinder?: Grinder;
  onDone: (grinder: Grinder) => void;
}) {
  const BURR_TYPES = ["flat", "conical", "hybrid"] as const;
  const ADJ_TYPES  = ["stepped", "micro_stepped", "stepless"] as const;
  const ADJ_LABELS: Record<string, string> = {
    stepped:       "Stepped",
    micro_stepped: "Micro-stepped",
    stepless:      "Stepless",
  };

  const form = useForm({
    defaultValues: {
      brand:           editGrinder?.brand          ?? initialBrand,
      model:           editGrinder?.model          ?? "",
      burr_type:       editGrinder?.burr_type       ?? "" as string,
      adjustment_type: editGrinder?.adjustment_type ?? "" as string,
      steps_per_unit:  editGrinder?.steps_per_unit != null
                         ? String(editGrinder.steps_per_unit)
                         : "",
      range_min:       editGrinder?.range_min != null ? String(editGrinder.range_min) : "",
      range_max:       editGrinder?.range_max != null ? String(editGrinder.range_max) : "",
      image_url:       editGrinder?.image_url       ?? "",
    },
    onSubmit: async ({ value }) => {
      const stepsPerUnit =
        value.adjustment_type === "micro_stepped" && value.steps_per_unit
          ? parseInt(value.steps_per_unit, 10)
          : null;

      const payload = {
        brand:           value.brand.trim(),
        model:           value.model.trim(),
        burr_type:       value.burr_type || null,
        adjustment_type: value.adjustment_type || null,
        steps_per_unit:  stepsPerUnit,
        range_min:       value.range_min ? parseFloat(value.range_min) : null,
        range_max:       value.range_max ? parseFloat(value.range_max) : null,
        image_url:       value.image_url.trim() || null,
      };

      if (editGrinder) {
        const { data, error } = await supabase
          .from("grinders")
          .update(payload)
          .eq("id", editGrinder.id)
          .select()
          .single();
        if (!error && data) onDone(data as Grinder);
      } else {
        const { data, error } = await supabase
          .from("grinders")
          .insert(payload)
          .select()
          .single();
        if (!error && data) onDone(data as Grinder);
      }
    },
  });

  return (
    <ScrollView className="flex-1 px-6 pt-4" contentContainerClassName="gap-3 pb-8" keyboardShouldPersistTaps="handled">
      <form.Field name="brand" validators={{ onBlur: ({ value }) => !value.trim() ? "Required" : undefined }}>
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
            <Text className="text-xs px-1" style={{ color: "#f87171", opacity: field.state.meta.errors.length > 0 ? 1 : 0 }}>
              {field.state.meta.errors[0] ?? " "}
            </Text>
          </View>
        )}
      </form.Field>

      <form.Field name="model" validators={{ onBlur: ({ value }) => !value.trim() ? "Required" : undefined }}>
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
            <Text className="text-xs px-1" style={{ color: "#f87171", opacity: field.state.meta.errors.length > 0 ? 1 : 0 }}>
              {field.state.meta.errors[0] ?? " "}
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
                  onPress={() => field.setValue(field.state.value === type ? "" : type)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    field.state.value === type
                      ? "bg-harvest-500 border-harvest-500"
                      : "border-ristretto-700"
                  }`}
                >
                  <Text className={`text-sm font-medium capitalize ${field.state.value === type ? "text-white" : "text-latte-400"}`}>
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
                  onPress={() => field.setValue(field.state.value === type ? "" : type)}
                  className={`px-4 py-3 rounded-xl border items-center ${
                    field.state.value === type
                      ? "bg-harvest-500 border-harvest-500"
                      : "border-ristretto-700"
                  }`}
                >
                  <Text className={`text-sm font-medium ${field.state.value === type ? "text-white" : "text-latte-400"}`}>
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
              {adjType === "micro_stepped" && (
                <form.Field name="steps_per_unit">
                  {(field) => (
                    <View className="gap-1">
                      <Text className="text-latte-400 text-xs px-1 mb-1">
                        Steps per number{" "}
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
                            adjType === "stepped" ? "40" :
                            adjType === "micro_stepped" ? "10" : "10"
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
            <Text className="text-latte-600 text-xs px-1">Only link to images you have rights to use.</Text>
          </View>
        )}
      </form.Field>

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
                {editGrinder ? "Save Changes" : "Add Grinder"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </form.Subscribe>
    </ScrollView>
  );
}
