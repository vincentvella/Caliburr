import { Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

type TargetType = 'recipe' | 'grinder' | 'machine';

const REASONS: { label: string; value: string }[] = [
  { label: 'Spam', value: 'spam' },
  { label: 'Incorrect data', value: 'incorrect' },
  { label: 'Inappropriate', value: 'inappropriate' },
  { label: 'Duplicate', value: 'duplicate' },
  { label: 'Other', value: 'other' },
];

async function submitReport(targetType: TargetType, targetId: string, reason: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await db.from('reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
  });

  if (error && error.code !== '23505') {
    // 23505 = unique violation (already reported) — silently ignore
    Sentry.captureException(error, {
      tags: { feature: 'report-submit', targetType },
      extra: { targetId, reason, userId: user.id },
    });
    Alert.alert('Error', 'Failed to submit report. Please try again.');
  } else {
    Alert.alert('Reported', "Thank you. We'll review this shortly.");
  }
}

export function promptReport(targetType: TargetType, targetId: string) {
  Alert.alert('Report', 'Why are you reporting this?', [
    ...REASONS.map(({ label, value }) => ({
      text: label,
      onPress: () => {
        submitReport(targetType, targetId, value);
      },
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
