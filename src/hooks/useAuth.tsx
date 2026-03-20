import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { identify, resetAnalytics } from '@/lib/analytics';

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

// Check admin role from user_roles table (security definer function)
const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (error) { console.error('Admin check failed:', error); return false; }
  return !!data;
};

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
  const currentUserIdRef = useRef<string | null>(null);
  const fetchedGenderUserIdRef = useRef<string | null>(null);

  const updateGender = useCallback((g: string | null) => {
    setUserGender(g as 'male' | 'female' | 'non-binary' | null);
  }, []);

  const checkSubscription = useCallback(async (userId?: string | null) => {
    const targetUserId = userId ?? currentUserIdRef.current;

    if (!targetUserId) {
      setIsSubscribed(false);
      setProductId(null);
      setSubscriptionEnd(null);
      setSubscriptionLoading(false);
      return;
    }

    // Admin override — grant premium without hitting Stripe
    const isAdmin = await checkIsAdmin(targetUserId);
    if (isAdmin) {
      setIsSubscribed(true);
      setProductId('admin_override');
      setSubscriptionEnd(null);
      setSubscriptionLoading(false);
      return;
    }

    try {
      const { data: resp, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      const payload = resp?.data ?? resp;
      setIsSubscribed(payload?.subscribed ?? false);
      setProductId(payload?.product_id ?? null);
      setSubscriptionEnd(payload?.subscription_end ?? null);
    } catch (e) {
      console.error('Subscription check failed:', e);
      setIsSubscribed(false);
      setProductId(null);
      setSubscriptionEnd(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  // Fetch gender once per user to avoid duplicate requests
  const fetchGender = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('gender').eq('user_id', userId).single();
      setUserGender((data?.gender as any) ?? null);
    } catch (e) {
      console.error('Gender fetch failed:', e);
      setUserGender(null);
    } finally {
      setGenderLoaded(true);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextUser = nextSession?.user ?? null;
      const nextUserId = nextUser?.id ?? null;

      currentUserIdRef.current = nextUserId;
      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);

      if (nextUserId) {
        identify(nextUserId, { email: nextUser?.email });
        setSubscriptionLoading(true);

        // Claim referral code if present and this is a brand-new account
        const refCode = new URLSearchParams(window.location.search).get('ref');
        const isNewUser = nextUser?.created_at &&
          (Date.now() - new Date(nextUser.created_at).getTime()) < 30_000;
        if (refCode && isNewUser) {
          supabase.functions.invoke('claim-referral', {
            body: { code: refCode },
          }).catch(() => {});
          window.history.replaceState({}, '', window.location.pathname);
        }
        setTimeout(() => checkSubscription(nextUserId), 0);

        if (fetchedGenderUserIdRef.current !== nextUserId) {
          fetchedGenderUserIdRef.current = nextUserId;
          setGenderLoaded(false);
          fetchGender(nextUserId);
        }
      } else {
        fetchedGenderUserIdRef.current = null;
        setUserGender(null);
        // Only mark loaded on explicit sign-out/delete; avoid startup null-session race
        if (event === 'SIGNED_OUT') {
          resetAnalytics();
          setGenderLoaded(true);
        }
        setIsSubscribed(false);
        setProductId(null);
        setSubscriptionEnd(null);
        setSubscriptionLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      const currentUser = currentSession?.user ?? null;
      const currentUserId = currentUser?.id ?? null;

      currentUserIdRef.current = currentUserId;
      setSession(currentSession);
      setUser(currentUser);
      setLoading(false);

      if (currentUserId) {
        setSubscriptionLoading(true);
        checkSubscription(currentUserId);

        if (fetchedGenderUserIdRef.current !== currentUserId) {
          fetchedGenderUserIdRef.current = currentUserId;
          setGenderLoaded(false);
          fetchGender(currentUserId);
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
    if (!user?.id) return;
    const interval = setInterval(() => checkSubscription(user.id), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, checkSubscription]);

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

