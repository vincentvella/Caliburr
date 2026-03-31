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

type View = "search" | "create";

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  existingIds: string[];
}

export function GrinderModal({ visible, onClose, onAdded, existingIds }: Props) {
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Grinder[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const search = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResults([]);
      return;
    }
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-ristretto-900">
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-ristretto-700">
          <Text className="text-latte-100 text-xl font-bold">
            {view === "search" ? "Add Grinder" : "New Grinder"}
          </Text>
          <TouchableOpacity onPress={view === "create" ? () => setView("search") : handleClose}>
            <Text className="text-harvest-400 font-semibold">
              {view === "create" ? "Back" : "Cancel"}
            </Text>
          </TouchableOpacity>
        </View>

        {view === "search" ? (
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
        ) : (
          <CreateGrinderForm
            initialBrand={query}
            onCreated={async (grinder) => {
              await handleAdd(grinder);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CreateGrinderForm({
  initialBrand,
  onCreated,
}: {
  initialBrand: string;
  onCreated: (grinder: Grinder) => void;
}) {
  const BURR_TYPES = ["flat", "conical", "hybrid"] as const;
  const ADJ_TYPES = ["stepped", "stepless"] as const;

  const form = useForm({
    defaultValues: {
      brand: initialBrand,
      model: "",
      burr_type: "" as string,
      adjustment_type: "" as string,
      image_url: "",
    },
    onSubmit: async ({ value }) => {
      const { data, error } = await supabase
        .from("grinders")
        .insert({
          brand: value.brand.trim(),
          model: value.model.trim(),
          burr_type: value.burr_type || null,
          adjustment_type: value.adjustment_type || null,
          image_url: value.image_url.trim() || null,
        })
        .select()
        .single();

      if (!error && data) onCreated(data as Grinder);
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
            <View className="flex-row gap-2">
              {ADJ_TYPES.map((type) => (
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

      <form.Field name="image_url">
        {(field) => (
          <View className="gap-1">
            <Text className="text-latte-400 text-xs px-1 mb-1">Image URL <Text className="text-latte-600">(optional)</Text></Text>
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
              <Text className="text-white font-semibold">Add Grinder</Text>
            )}
          </TouchableOpacity>
        )}
      </form.Subscribe>
    </ScrollView>
  );
}
