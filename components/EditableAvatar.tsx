import { useMemo, useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { gravatarUrlForEmail } from '@/lib/gravatar';

interface Props {
  size?: number;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  uploading?: boolean;
  onPress: () => void;
}

/**
 * Avatar with three fallback layers:
 *   1. avatarUrl (uploaded) — wins when set
 *   2. Gravatar for the email — used if it returns 200
 *   3. Letter circle — final fallback
 *
 * Tapping the avatar invokes onPress (typically opens the image picker).
 * The "Edit" / "Add" pill in the corner is always rendered to hint
 * tappability.
 */
export function EditableAvatar({
  size = 96,
  email,
  displayName,
  avatarUrl,
  uploading,
  onPress,
}: Props) {
  const gravatarUrl = useMemo(
    () => (email ? gravatarUrlForEmail(email, size * 2) : null),
    [email, size],
  );
  const [gravatarFailed, setGravatarFailed] = useState(false);

  // Reset failure state when the inputs that drive the URL change.
  useEffect(() => {
    setGravatarFailed(false);
  }, [gravatarUrl, avatarUrl]);

  const initial = (displayName || email || '?').slice(0, 1).toUpperCase();
  const radius = size / 2;
  const showGravatar = !avatarUrl && gravatarUrl && !gravatarFailed;

  return (
    <TouchableOpacity onPress={onPress} disabled={uploading} activeOpacity={0.85}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700"
        />
      ) : showGravatar ? (
        <Image
          source={{ uri: gravatarUrl! }}
          style={{ width: size, height: size, borderRadius: radius }}
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700"
          onError={() => setGravatarFailed(true)}
        />
      ) : (
        <View
          style={{ width: size, height: size, borderRadius: radius }}
          className="bg-harvest-500/15 border border-latte-200 dark:border-ristretto-700 items-center justify-center"
        >
          {uploading ? (
            <ActivityIndicator color="#ff9d37" />
          ) : (
            <Text
              className="text-harvest-700 dark:text-harvest-300 font-semibold"
              style={{ fontSize: size * 0.4 }}
            >
              {initial}
            </Text>
          )}
        </View>
      )}
      <View className="absolute bottom-0 right-0 bg-harvest-500 rounded-full px-2 py-1">
        <Text className="text-white text-xs font-semibold">{avatarUrl ? 'Edit' : 'Add'}</Text>
      </View>
    </TouchableOpacity>
  );
}
