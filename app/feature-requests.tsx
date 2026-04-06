import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  type FeatureRequest,
  type FeatureRequestStatus,
  FEATURE_REQUEST_STATUS_LABELS,
} from '@/lib/types';

const STATUS_STYLES: Record<FeatureRequestStatus, { container: string; text: string }> = {
  open: {
    container: 'bg-oat-200 dark:bg-ristretto-700 border border-latte-300 dark:border-ristretto-600',
    text: 'text-latte-600 dark:text-latte-400',
  },
  planned: {
    container:
      'bg-cold-brew-100 dark:bg-cold-brew-800 border border-cold-brew-200 dark:border-cold-brew-700',
    text: 'text-cold-brew-600 dark:text-cold-brew-300',
  },
  done: {
    container: 'bg-bloom-100 dark:bg-bloom-900 border border-bloom-300 dark:border-bloom-700',
    text: 'text-bloom-700 dark:text-bloom-400',
  },
};

export default function FeatureRequestsScreen() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function fetchData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data: reqs } = await supabase
      .from('feature_requests')
      .select('*')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false });

    if (reqs) setRequests(reqs as FeatureRequest[]);

    if (user) {
      const { data: votes } = await supabase
        .from('feature_request_upvotes')
        .select('request_id')
        .eq('user_id', user.id);
      setUpvotedIds(new Set((votes ?? []).map((v) => v.request_id)));
    }
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function handleUpvote(requestId: string) {
    if (!userId || togglingId) return;
    setTogglingId(requestId);
    const already = upvotedIds.has(requestId);

    setUpvotedIds((prev) => {
      const next = new Set(prev);
      if (already) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, upvotes: r.upvotes + (already ? -1 : 1) } : r)),
    );

    if (already) {
      await supabase
        .from('feature_request_upvotes')
        .delete()
        .eq('request_id', requestId)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('feature_request_upvotes')
        .insert({ request_id: requestId, user_id: userId });
    }
    setTogglingId(null);
  }

  function confirmDelete(requestId: string) {
    Alert.alert('Delete Request', 'Remove this feature request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('feature_requests').delete().eq('id', requestId);
          setRequests((prev) => prev.filter((r) => r.id !== requestId));
        },
      },
    ]);
  }

  function closeForm() {
    setFormOpen(false);
    setTitle('');
    setDescription('');
    setSubmitError(null);
  }

  async function handleSubmit() {
    if (!title.trim() || !userId) return;
    setSubmitting(true);
    setSubmitError(null);

    const { data, error } = await supabase
      .from('feature_requests')
      .insert({ user_id: userId, title: title.trim(), description: description.trim() || null })
      .select()
      .single();

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    setRequests((prev) => [data as FeatureRequest, ...prev]);
    closeForm();
    setSubmitting(false);
  }

  return (
    <View className="flex-1 bg-latte-50 dark:bg-ristretto-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-harvest-400 font-semibold">‹ Account</Text>
        </TouchableOpacity>
        <Text className="text-latte-950 dark:text-latte-100 font-semibold">Feature Requests</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff9d37" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff9d37" />
          }
        >
          <Text className="text-latte-600 dark:text-latte-500 text-sm mb-4 px-1">
            Vote on ideas or suggest something new. Sorted by most wanted.
          </Text>

          {requests.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-latte-600 dark:text-latte-500 text-sm">
                No requests yet — submit the first one.
              </Text>
            </View>
          ) : (
            requests.map((req) => {
              const upvoted = upvotedIds.has(req.id);
              const isOwn = req.user_id === userId;
              const { container, text } = STATUS_STYLES[req.status];

              return (
                <View
                  key={req.id}
                  className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl p-4 mb-3"
                >
                  <View className="flex-row items-start gap-2">
                    <View className="flex-1">
                      <Text className="text-latte-950 dark:text-latte-100 font-display-semibold text-base mb-1">
                        {req.title}
                      </Text>
                      {req.description ? (
                        <Text className="text-latte-600 dark:text-latte-500 text-sm leading-relaxed">
                          {req.description}
                        </Text>
                      ) : null}
                    </View>
                    {isOwn && req.status === 'open' && (
                      <TouchableOpacity
                        onPress={() => confirmDelete(req.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text className="text-latte-500 dark:text-latte-600 text-lg leading-none">
                          ×
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between mt-3">
                    <View className={`rounded-full px-2 py-0.5 ${container}`}>
                      <Text className={`text-xs font-medium ${text}`}>
                        {FEATURE_REQUEST_STATUS_LABELS[req.status]}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleUpvote(req.id)}
                      disabled={!userId || req.status === 'done'}
                      accessibilityLabel={`${req.upvotes} votes. ${upvoted ? 'Remove vote' : 'Vote'}`}
                      accessibilityRole="button"
                      className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                        upvoted
                          ? 'bg-harvest-500 border-harvest-500'
                          : 'bg-oat-200 dark:bg-ristretto-700 border-latte-300 dark:border-ristretto-600'
                      }`}
                    >
                      <Text
                        className={`text-sm ${upvoted ? 'text-white' : 'text-latte-600 dark:text-latte-500'}`}
                      >
                        ▲
                      </Text>
                      <Text
                        className={`text-xs font-semibold ${upvoted ? 'text-white' : 'text-latte-600 dark:text-latte-500'}`}
                      >
                        {req.upvotes}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View className="h-24" />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setFormOpen(true)}
        className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-harvest-500 items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>

      {/* Submit form */}
      <Modal
        visible={formOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-latte-50 dark:bg-ristretto-900"
        >
          <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-latte-200 dark:border-ristretto-700">
            <TouchableOpacity onPress={closeForm}>
              <Text className="text-latte-600 dark:text-latte-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-latte-950 dark:text-latte-100 font-semibold">New Request</Text>
            <View style={{ width: 64 }} />
          </View>

          <ScrollView className="flex-1 px-6 pt-6" keyboardShouldPersistTaps="handled">
            <Text className="text-latte-700 dark:text-latte-400 text-sm font-medium mb-1">
              Title
            </Text>
            <TextInput
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base mb-4"
              style={{ lineHeight: undefined }}
              placeholder="What would you like to see?"
              placeholderTextColor="#6e5a47"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              returnKeyType="next"
            />

            <Text className="text-latte-700 dark:text-latte-400 text-sm font-medium mb-1">
              Description{' '}
              <Text className="text-latte-500 dark:text-latte-600 font-normal">(optional)</Text>
            </Text>
            <TextInput
              className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base mb-6"
              style={{ lineHeight: undefined }}
              placeholder="Any extra context..."
              placeholderTextColor="#6e5a47"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
            />

            {submitError ? (
              <Text className="text-sm mb-4" style={{ color: '#f87171' }}>
                {submitError}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !title.trim()}
              className={`rounded-xl py-4 items-center ${
                title.trim() ? 'bg-harvest-500' : 'bg-oat-200 dark:bg-ristretto-700'
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className={`font-semibold text-base ${
                    title.trim() ? 'text-white' : 'text-latte-500 dark:text-latte-600'
                  }`}
                >
                  Submit Request
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
