import type { ReactNode } from 'react';
import { View } from 'react-native';

export function MaxWidth({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 680 }}>{children}</View>
    </View>
  );
}
