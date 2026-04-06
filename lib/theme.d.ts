// Type shim — Metro resolves `./theme` to `./theme.native.tsx` or `./theme.web.tsx`.
// TypeScript resolves this file for type checking.

import type React from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

export declare function ThemeProvider(props: { children: React.ReactNode }): React.JSX.Element;

export declare function useTheme(): {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
};
