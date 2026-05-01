import { textInputStyle } from '@/lib/styles';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { haptics } from '@/lib/haptics';
import type { RecipeTry } from '@/lib/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  recipeId: string;
  existing: RecipeTry | null;
  onSaved: (saved: RecipeTry) => void;
}

export function TriedThisModal({ visible, onClose, recipeId, existing, onSaved }: Props) {
  const [worked, setWorked] = useState<boolean | null>(null);
  const [grindDelta, setGrindDelta] = useState('');
  const [yieldDelta, setYieldDelta] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setWorked(existing?.worked ?? null);
    setGrindDelta(existing?.grind_delta ?? '');
    setYieldDelta(existing?.yield_delta_g != null ? String(existing.yield_delta_g) : '');
    setNotes(existing?.notes ?? '');
    setError(null);
  }, [visible, existing]);

  const isWeb = Platform.OS === 'web';

  async function handleSave() {
    if (worked == null) {
      setError('Tap 👍 or 👎 to record whether it worked.');
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError('You need to be signed in to log a try.');
      return;
    }

    const yieldNum = yieldDelta.trim() === '' ? null : Number(yieldDelta);
    if (yieldNum != null && Number.isNaN(yieldNum)) {
      setSaving(false);
      setError('Yield delta must be a number (e.g. -2 or 1.5).');
      return;
    }

    const payload = {
      recipe_id: recipeId,
      user_id: user.id,
      worked,
      grind_delta: grindDelta.trim() || null,
      yield_delta_g: yieldNum,
      notes: notes.trim() || null,
    };

    const { data, error: dbError } = await db
      .from('recipe_tries')
      .upsert(payload, { onConflict: 'recipe_id,user_id' })
      .select()
      .single();

    setSaving(false);

    if (dbError) {
      Sentry.captureException(dbError, { tags: { feature: 'recipe-try', stage: 'upsert' } });
      setError(dbError.message);
      return;
    }

    haptics.success();
    onSaved(data as RecipeTry);
    onClose();
  }

  const Body = (
    <ScrollView
      contentContainerClassName="px-6 pt-4 pb-8 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="text-latte-600 dark:text-latte-500 text-xs uppercase tracking-wide mb-2">
          Did it work?
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setWorked(true)}
            className={`flex-1 rounded-xl py-4 items-center border ${
              worked === true
                ? 'bg-bloom-500 border-bloom-500'
                : 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700'
            }`}
          >
            <Text
              className={`font-semibold ${
                worked === true ? 'text-white' : 'text-latte-700 dark:text-latte-300'
              }`}
            >
              👍 Worked
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWorked(false)}
            className={`flex-1 rounded-xl py-4 items-center border ${
              worked === false
                ? 'bg-red-500 border-red-500'
                : 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700'
            }`}
          >
            <Text
              className={`font-semibold ${
                worked === false ? 'text-white' : 'text-latte-700 dark:text-latte-300'
              }`}
            >
              👎 Didn&apos;t work
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View>
        <Text className="text-latte-600 dark:text-latte-500 text-xs uppercase tracking-wide mb-2">
          Grind adjustment <Text className="text-latte-500 dark:text-latte-600">(optional)</Text>
        </Text>
        <TextInput
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
          style={textInputStyle}
          placeholder="e.g. 0.5 finer"
          placeholderTextColor="#9c7a5e"
          value={grindDelta}
          onChangeText={setGrindDelta}
          autoCapitalize="none"
          returnKeyType="next"
        />
      </View>

      <View>
        <Text className="text-latte-600 dark:text-latte-500 text-xs uppercase tracking-wide mb-2">
          Yield delta (g) <Text className="text-latte-500 dark:text-latte-600">(optional)</Text>
        </Text>
        <TextInput
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
          style={textInputStyle}
          placeholder="e.g. -2 or 1.5"
          placeholderTextColor="#9c7a5e"
          value={yieldDelta}
          onChangeText={setYieldDelta}
          keyboardType="numbers-and-punctuation"
          returnKeyType="next"
        />
      </View>

      <View>
        <Text className="text-latte-600 dark:text-latte-500 text-xs uppercase tracking-wide mb-2">
          Notes <Text className="text-latte-500 dark:text-latte-600">(optional)</Text>
        </Text>
        <TextInput
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
          style={[textInputStyle, { minHeight: 88 }]}
          placeholder="What did you change? How was it?"
          placeholderTextColor="#9c7a5e"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />
      </View>

      {error ? (
        <Text className="text-sm" style={{ color: '#f87171' }}>
          {error}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className="bg-harvest-500 rounded-xl py-4 items-center mt-2"
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">
            {existing ? 'Update' : 'Log Try'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType={isWeb ? 'fade' : 'slide'}
      presentationStyle={isWeb ? 'overFullScreen' : 'pageSheet'}
      transparent={isWeb}
      onRequestClose={onClose}
    >
      {isWeb ? (
        <Pressable
          onPress={onClose}
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-latte-50 dark:bg-ristretto-900 rounded-2xl overflow-hidden w-full"
            style={{ maxWidth: 480, maxHeight: '85%' }}
          >
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-latte-200 dark:border-ristretto-700">
              <Text className="text-latte-950 dark:text-latte-100 text-xl font-bold">
                {existing ? 'Edit your try' : 'I tried this'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text className="text-harvest-400 font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
            {Body}
          </Pressable>
        </Pressable>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-latte-50 dark:bg-ristretto-900"
        >
          <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-latte-200 dark:border-ristretto-700">
            <Text className="text-latte-950 dark:text-latte-100 text-xl font-bold">
              {existing ? 'Edit your try' : 'I tried this'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-harvest-400 font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
          {Body}
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}
