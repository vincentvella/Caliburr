import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Returns whether the current user has an active Caliburr Backer subscription.
 * Used to gate beta features throughout the app.
 */
export function useBetaAccess(): { isBacker: boolean; loading: boolean } {
  const [isBacker, setIsBacker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('backer_tier')
        .eq('user_id', user.id)
        .single();
      setIsBacker(!!data?.backer_tier);
      setLoading(false);
    }
    check();
  }, []);

  return { isBacker, loading };
}
