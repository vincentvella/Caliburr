import type { ReactNode } from 'react';
import { View } from 'react-native';

export function MaxWidth({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
