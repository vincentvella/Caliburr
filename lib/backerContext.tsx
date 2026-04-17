import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as purchases from '@/lib/purchases';

interface BackerContextValue {
  isBacker: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BackerContext = createContext<BackerContextValue>({
  isBacker: false,
  loading: true,
  refresh: async () => {},
});

export function BackerProvider({ children }: { children: ReactNode }) {
  const [isBacker, setIsBacker] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const active = await purchases.isBackerActive();
      setIsBacker(active);
    } catch {
      // Not a backer if RevenueCat is unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  // Check once on mount — RC is configured + logged in before BackerProvider renders
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <BackerContext.Provider value={{ isBacker, loading, refresh }}>
      {children}
    </BackerContext.Provider>
  );
}

export function useBackerContext() {
  return useContext(BackerContext);
}
