import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Cache admin status for the lifetime of the session to avoid redundant RPCs */
const adminCache = new Map<string, boolean>();

async function checkIsAdmin(userId: string): Promise<boolean> {
  if (adminCache.has(userId)) return adminCache.get(userId)!;
  const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (error) { console.error('Admin check failed:', error); return false; }
  const result = !!data;
  adminCache.set(userId, result);
  return result;
}

export interface SubscriptionState {
  isSubscribed: boolean;
  subscriptionLoading: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  checkSubscription: (userId?: string | null) => Promise<void>;
}

/**
 * Manages subscription status independently of auth state.
 * Accepts the current user ID so the hook can react to auth changes.
 */
export function useSubscription(currentUserId: string | null): SubscriptionState {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [productId, setProductId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const userIdRef = useRef(currentUserId);
  userIdRef.current = currentUserId;

  const checkSubscription = useCallback(async (userId?: string | null) => {
    const targetUserId = userId ?? userIdRef.current;

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

  // Auto-refresh every 5 minutes while a user is active
  useEffect(() => {
    if (!currentUserId) return;
    const interval = setInterval(() => checkSubscription(currentUserId), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUserId, checkSubscription]);

  return { isSubscribed, subscriptionLoading, productId, subscriptionEnd, checkSubscription };
}
