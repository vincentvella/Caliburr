import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

/**
 * Placeholder screen for the center "Brew" tab. The tab layout intercepts
 * tabPress and routes straight to the new-recipe modal, so this screen
 * shouldn't render in normal use. If a deep link or programmatic nav lands
 * here directly, redirect to the modal.
 */
export default function BrewTab() {
  useEffect(() => {
    router.replace('/recipe/new');
  }, []);

  return <View className="flex-1 bg-latte-50 dark:bg-ristretto-900" />;
}
