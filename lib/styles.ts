import { Platform } from 'react-native';

/** Prevents iOS text clipping in TextInput without collapsing Android layout */
export const textInputStyle = Platform.OS === 'ios' ? ({ lineHeight: undefined } as const) : {};
