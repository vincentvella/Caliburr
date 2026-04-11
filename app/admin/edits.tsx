import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface GrinderEdit {
  id: string;
  grinder_id: string;
  proposed_by: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  grinder: {
    brand: string;
    model: string;
    burr_type: string | null;
    adjustment_type: string | null;
    steps_per_unit: number | null;
    range_min: number | null;
    range_max: number | null;
    image_url: string | null;
  };
}

interface MachineEdit {
  id: string;
  machine_id: string;
  proposed_by: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  machine: {
    brand: string;
    model: string;
    machine_type: string;
    image_url: string | null;
  };
}

interface PendingImage {
  id: string;
  brand: string;
  model: string;
  image_url: string;
  type: 'grinder' | 'machine';
}

const FIELD_LABELS: Record<string, string> = {
  brand: 'Brand',
  model: 'Model',
  burr_type: 'Burr Type',
  adjustment_type: 'Adjustment',
  steps_per_unit: 'Steps / Unit',
  range_min: 'Range Min',
  range_max: 'Range Max',
  image_url: 'Image URL',
  machine_type: 'Machine Type',
};

function DiffRow({ field, before, after }: { field: string; before: unknown; after: unknown }) {
  const changed = String(before ?? '—') !== String(after ?? '—');
  if (!changed) return null;
  return (
    <View className="flex-row gap-2 py-1.5 border-b border-latte-100 dark:border-ristretto-800">
      <Text className="text-latte-500 dark:text-latte-600 text-xs w-24">
        {FIELD_LABELS[field] ?? field}
      </Text>
      <Text className="text-red-400 text-xs line-through flex-1">{String(before ?? '—')}</Text>
      <Text className="text-bloom-500 text-xs flex-1">{String(after ?? '—')}</Text>
    </View>
  );
}

function usePendingEdits() {
  const [grinderEdits, setGrinderEdits] = useState<GrinderEdit[]>([]);
  const [machineEdits, setMachineEdits] = useState<MachineEdit[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEdits = useCallback(async () => {
    const [gRes, mRes, giRes, miRes] = await Promise.all([
      supabase
        .from('grinder_edits')
        .select(
          '*, grinder:grinders(brand, model, burr_type, adjustment_type, steps_per_unit, range_min, range_max, image_url)',
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('machine_edits')
        .select('*, machine:brew_machines(brand, model, machine_type, image_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('grinders')
        .select('id, brand, model, image_url')
        .eq('image_status' as never, 'pending'),
      supabase
        .from('brew_machines')
        .select('id, brand, model, image_url')
        .eq('image_status' as never, 'pending'),
    ]);

    setGrinderEdits((gRes.data ?? []) as GrinderEdit[]);
    setMachineEdits((mRes.data ?? []) as MachineEdit[]);
    setPendingImages([
      ...(giRes.data ?? []).map((g) => ({ ...g, type: 'grinder' as const })),
      ...(miRes.data ?? []).map((m) => ({ ...m, type: 'machine' as const })),
    ] as PendingImage[]);
  }, []);

  useEffect(() => {
    fetchEdits().finally(() => setLoading(false));
  }, [fetchEdits]);

  return {
    grinderEdits,
    setGrinderEdits,
    machineEdits,
    setMachineEdits,
    pendingImages,
    setPendingImages,
    loading,
  };
}

export default function AdminScreen() {
  const {
    grinderEdits,
    setGrinderEdits,
    machineEdits,
    setMachineEdits,
    pendingImages,
    setPendingImages,
    loading,
  } = usePendingEdits();
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function handleAction(
    editId: string,
    editType: 'grinder' | 'machine',
    action: 'approve' | 'reject',
  ) {
    setActioningId(editId);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error } = await supabase.functions.invoke('review-equipment-edit', {
      body: { editId, editType, action },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    if (error) {
      Alert.alert('Error', 'Failed to process edit. Please try again.');
    } else {
      if (editType === 'grinder') {
        setGrinderEdits((prev) => prev.filter((e) => e.id !== editId));
      } else {
        setMachineEdits((prev) => prev.filter((e) => e.id !== editId));
      }
    }
    setActioningId(null);
  }

  async function handleImageAction(image: PendingImage, action: 'approve' | 'reject') {
    setActioningId(image.id);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error } = await supabase.functions.invoke('approve-equipment-image', {
      body: { equipmentId: image.id, equipmentType: image.type, action },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    if (error) {
      Alert.alert(
        'Error',
        action === 'approve'
          ? 'Failed to fetch or process the image. The URL may be unreachable.'
          : 'Failed to reject image.',
      );
    } else {
      setPendingImages((prev) => prev.filter((i) => i.id !== image.id));
    }
    setActioningId(null);
  }

  const totalPending = grinderEdits.length + machineEdits.length + pendingImages.length;

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Equipment Edits</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : totalPending === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-latte-600 dark:text-latte-500 text-sm">No pending edits.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            Grinders · {grinderEdits.length}
          </Text>

          {grinderEdits.map((edit) => (
            <EditCard
              key={edit.id}
              title={`${edit.grinder.brand} ${edit.grinder.model}`}
              current={edit.grinder as Record<string, unknown>}
              proposed={edit.payload}
              createdAt={edit.created_at}
              actioning={actioningId === edit.id}
              onApprove={() => handleAction(edit.id, 'grinder', 'approve')}
              onReject={() => handleAction(edit.id, 'grinder', 'reject')}
            />
          ))}

          <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3 mt-4 px-1">
            Machines · {machineEdits.length}
          </Text>

          {machineEdits.map((edit) => (
            <EditCard
              key={edit.id}
              title={`${edit.machine.brand} ${edit.machine.model}`}
              current={edit.machine as Record<string, unknown>}
              proposed={edit.payload}
              createdAt={edit.created_at}
              actioning={actioningId === edit.id}
              onApprove={() => handleAction(edit.id, 'machine', 'approve')}
              onReject={() => handleAction(edit.id, 'machine', 'reject')}
            />
          ))}

          {pendingImages.length > 0 && (
            <>
              <Text className="text-latte-600 dark:text-latte-500 text-xs font-semibold uppercase tracking-wider mb-3 mt-4 px-1">
                Pending Images · {pendingImages.length}
              </Text>
              {pendingImages.map((item) => (
                <View
                  key={item.id}
                  className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4 mb-3"
                >
                  <Text className="text-latte-950 dark:text-latte-100 font-display-semibold text-base mb-1">
                    {item.brand} {item.model}
                  </Text>
                  <Text className="text-latte-500 dark:text-latte-600 text-xs mb-3 capitalize">
                    {item.type}
                  </Text>
                  <Image
                    source={{ uri: item.image_url }}
                    className="w-full h-48 rounded-xl bg-latte-200 dark:bg-ristretto-700 mb-3"
                    resizeMode="contain"
                  />
                  <Text
                    className="text-latte-500 dark:text-latte-600 text-xs mb-3 leading-5"
                    numberOfLines={2}
                  >
                    {item.image_url}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleImageAction(item, 'approve')}
                      disabled={actioningId === item.id}
                      className="flex-1 bg-bloom-600 rounded-xl py-3 items-center"
                    >
                      {actioningId === item.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-white font-semibold text-sm">Approve</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleImageAction(item, 'reject')}
                      disabled={actioningId === item.id}
                      className="flex-1 border border-latte-300 dark:border-ristretto-600 rounded-xl py-3 items-center"
                    >
                      <Text className="text-latte-600 dark:text-latte-500 text-sm">Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          <View className="h-12" />
        </ScrollView>
      )}
    </View>
  );
}

function EditCard({
  title,
  current,
  proposed,
  createdAt,
  actioning,
  onApprove,
  onReject,
}: {
  title: string;
  current: Record<string, unknown>;
  proposed: Record<string, unknown>;
  createdAt: string;
  actioning: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const changedFields = Object.keys(proposed).filter(
    (k) => String(proposed[k] ?? '—') !== String(current[k] ?? '—'),
  );

  return (
    <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4 mb-3">
      <Text className="text-latte-950 dark:text-latte-100 font-display-semibold text-base mb-1">
        {title}
      </Text>
      <Text className="text-latte-500 dark:text-latte-600 text-xs mb-3">
        {new Date(createdAt).toLocaleDateString()} · {changedFields.length} field
        {changedFields.length !== 1 ? 's' : ''} changed
      </Text>

      <View className="mb-3">
        {changedFields.map((field) => (
          <DiffRow key={field} field={field} before={current[field]} after={proposed[field]} />
        ))}
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={onApprove}
          disabled={actioning}
          className="flex-1 bg-bloom-600 rounded-xl py-3 items-center"
        >
          {actioning ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white font-semibold text-sm">Approve</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onReject}
          disabled={actioning}
          className="flex-1 border border-latte-300 dark:border-ristretto-600 rounded-xl py-3 items-center"
        >
          <Text className="text-latte-600 dark:text-latte-500 text-sm">Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
