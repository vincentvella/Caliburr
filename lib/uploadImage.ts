import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

// Output is always 1200×900 JPEG at 80% — reliably 150–400 KB, never approaching 2 MB
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 900; // 4:3
const JPEG_QUALITY = 0.8;

/**
 * Opens the system image picker with an in-app 4:3 crop tool, resizes and
 * compresses on-device to a fixed 1200×900 JPEG, then uploads to Supabase
 * Storage. Returns the public URL, or null if the user cancels.
 */
export async function pickAndUploadImage(folder: string): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission required',
      'Please allow photo library access in Settings to add an image.',
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true, // in-app crop tool
    aspect: [4, 3],
    quality: 1, // always fetch full quality — we compress below
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];

  if (asset.width < 200 || asset.height < 150) {
    Alert.alert('Image too small', 'Please choose an image that is at least 200 × 150 pixels.');
    return null;
  }

  // Resize to exactly OUTPUT_WIDTH × OUTPUT_HEIGHT and compress to JPEG on-device.
  // At these settings the output is always well under 500 KB.
  const processed = await manipulateAsync(
    asset.uri,
    [{ resize: { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT } }],
    { compress: JPEG_QUALITY, format: SaveFormat.JPEG },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const fileName = `${user.id}/${folder}/${Date.now()}.jpg`;
  const response = await fetch(processed.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('equipment-images')
    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    Alert.alert('Upload failed', 'Could not upload image. Please try again.');
    return null;
  }

  const { data } = supabase.storage.from('equipment-images').getPublicUrl(fileName);
  return data.publicUrl;
}
