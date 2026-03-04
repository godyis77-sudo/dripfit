import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type GenderPreference = 'mens' | 'womens' | null;

/**
 * Returns the authenticated user's saved gender/shopping preference.
 * Falls back to null (meaning "all") if unset or not logged in.
 */
export function useUserGender() {
  const { user } = useAuth();
  const [gender, setGender] = useState<GenderPreference>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setGender(null);
      setLoaded(true);
      return;
    }
    supabase
      .from('profiles')
      .select('gender')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.gender === 'mens' || data?.gender === 'womens') {
          setGender(data.gender as GenderPreference);
        }
        setLoaded(true);
      });
  }, [user]);

  return { gender, loaded };
}
