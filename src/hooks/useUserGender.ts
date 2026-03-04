import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type GenderPreference = 'mens' | 'womens' | null;

// Map profile gender values to catalog filter values
const GENDER_MAP: Record<string, GenderPreference> = {
  male: 'mens',
  mens: 'mens',
  female: 'womens',
  womens: 'womens',
};

/**
 * Returns the authenticated user's saved gender/shopping preference
 * mapped to catalog filter values ('mens' | 'womens' | null).
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
        const mapped = GENDER_MAP[data?.gender ?? ''] ?? null;
        setGender(mapped);
        setLoaded(true);
      });
  }, [user]);

  return { gender, loaded };
}
