import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { db } from '@/lib/db';

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
      const { data: { user } } = await db.auth.getUser();
      if (!user) { setIsBacker(false); return; }
      const { data } = await db
        .from('profiles')
        .select('backer_tier')
        .eq('user_id', user.id)
        .single();
      setIsBacker(!!data?.backer_tier);
    } catch {
      // leave as false
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
