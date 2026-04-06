import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ScopedTheme, Uniwind } from 'uniwind';
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

function readPreference(): ThemePreference {
  const stored = storage.getString(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyPreference(pref: ThemePreference) {
  if (typeof window === 'undefined') return;
  Uniwind.setTheme(pref);
  // rnw.js (loaded with Unifind's web View) also calls addClassNameToRoot() via
  // UniwindListener, so <html> class stays in sync automatically.
}

const initialPreference = readPreference();
const initialResolved = resolveTheme(initialPreference);
applyPreference(initialPreference);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [resolved, setResolved] = useState<'light' | 'dark'>(initialResolved);

  // In system mode, keep the resolved theme in sync with OS changes.
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    setResolved(resolveTheme(pref));
    applyPreference(pref);
    storage.set(STORAGE_KEY, pref);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {/* ScopedTheme sets UniwindContext.scopedTheme so getWebStyles uses the correct
          theme class on its dummyParent element when evaluating dark: CSS rules. */}
      <ScopedTheme theme={resolved}>{children}</ScopedTheme>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
