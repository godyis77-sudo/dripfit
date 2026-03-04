import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isSubscribed: boolean;
  subscriptionLoading: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
  userGender: 'male' | 'female' | 'non-binary' | null;
  genderLoaded: boolean;
  updateGender: (g: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  isSubscribed: false,
  subscriptionLoading: true,
  productId: null,
  subscriptionEnd: null,
  checkSubscription: async () => {},
  userGender: null,
  genderLoaded: false,
  updateGender: () => {},
});

// Admin user IDs that always get premium access (for troubleshooting)
const ADMIN_USER_IDS = ['f83b26d7-453c-411a-aba8-5688fc8baa18'];

export const STRIPE_TIERS = {
  monthly: {
    price_id: "price_1T56IXQaG3oYhM6e5KPtbzma",
    product_id: "prod_U3ChrYjsL6sDaJ",
  },
  annual: {
    price_id: "price_1T56IsQaG3oYhM6esioOSiad",
    product_id: "prod_U3CiFpBgNOe7Id",
  },
} as const;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [productId, setProductId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<'male' | 'female' | 'non-binary' | null>(null);
  const [genderLoaded, setGenderLoaded] = useState(false);

  const updateGender = useCallback((g: string | null) => {
    setUserGender(g as 'male' | 'female' | 'non-binary' | null);
  }, []);

  const checkSubscription = useCallback(async () => {
    // Admin override — grant premium without hitting Stripe
    if (user && ADMIN_USER_IDS.includes(user.id)) {
      setIsSubscribed(true);
      setProductId('admin_override');
      setSubscriptionEnd(null);
      setSubscriptionLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setIsSubscribed(data?.subscribed ?? false);
      setProductId(data?.product_id ?? null);
      setSubscriptionEnd(data?.subscription_end ?? null);
    } catch (e) {
      console.error('Subscription check failed:', e);
      setIsSubscribed(false);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [user]);

  // Fetch gender once per user to avoid duplicate requests
  const fetchGender = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('gender').eq('user_id', userId).single();
    setUserGender((data?.gender as any) ?? null);
    setGenderLoaded(true);
  }, []);

  useEffect(() => {
    let genderFetched = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => checkSubscription(), 0);
        if (!genderFetched) {
          genderFetched = true;
          setGenderLoaded(false);
          fetchGender(session.user.id);
        }
      } else {
        setUserGender(null);
        // Only mark loaded on explicit sign-out/delete; avoid startup null-session race
        if (event === 'SIGNED_OUT') {
          setGenderLoaded(true);
        }
        setIsSubscribed(false);
        setSubscriptionLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkSubscription();
        if (!genderFetched) {
          genderFetched = true;
          setGenderLoaded(false);
          fetchGender(session.user.id);
        }
      } else {
        setGenderLoaded(true);
        setSubscriptionLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkSubscription, fetchGender]);

  // Auto-refresh subscription status every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, isSubscribed, subscriptionLoading, productId, subscriptionEnd, checkSubscription, userGender, genderLoaded, updateGender }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
