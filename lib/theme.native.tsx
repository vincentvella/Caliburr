import { createContext, useCallback, useContext, useState } from 'react';
import { Appearance } from 'react-native';
import { storage } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = '@theme_preference';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  setPreference: () => {},
});

function applyPreference(pref: ThemePreference) {
  Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
}

function readPreference(): ThemePreference {
  const stored = storage.getString(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

// Apply immediately at module load — no flash, no useEffect
const initialPreference = readPreference();
applyPreference(initialPreference);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    applyPreference(pref);
    storage.set(STORAGE_KEY, pref);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
