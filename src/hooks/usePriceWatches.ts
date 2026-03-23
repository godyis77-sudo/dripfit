import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PriceWatch {
  id: string;
  product_id: string | null;
  product_url: string | null;
  product_name: string | null;
  brand: string | null;
  original_price_cents: number;
  current_price_cents: number;
  lowest_price_cents: number;
  currency: string;
  last_checked_at: string | null;
  created_at: string;
}

export interface PriceDropNotification {
  id: string;
  watch_id: string;
  old_price_cents: number;
  new_price_cents: number;
  drop_percent: number;
  is_read: boolean;
  created_at: string;
  watch?: PriceWatch;
}

export function usePriceWatches() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const watchesQuery = useQuery({
    queryKey: ['price-watches', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('price_watches')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data || []) as PriceWatch[];
    },
    enabled: !!user?.id,
  });

  const dropsQuery = useQuery({
    queryKey: ['price-drops', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('price_drop_notifications')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data || []) as PriceDropNotification[];
    },
    enabled: !!user?.id,
  });

  const addWatch = useMutation({
    mutationFn: async (params: {
      product_id: string;
      product_name?: string;
      brand?: string;
      product_url?: string;
      price_cents: number;
      currency?: string;
    }) => {
      const { error } = await supabase.from('price_watches').insert({
        user_id: user!.id,
        product_id: params.product_id,
        product_name: params.product_name || null,
        brand: params.brand || null,
        product_url: params.product_url || null,
        original_price_cents: params.price_cents,
        current_price_cents: params.price_cents,
        lowest_price_cents: params.price_cents,
        currency: params.currency || 'USD',
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price-watches'] }),
  });

  const removeWatch = useMutation({
    mutationFn: async (watchId: string) => {
      await supabase.from('price_watches').delete().eq('id', watchId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price-watches'] }),
  });

  const markRead = useMutation({
    mutationFn: async (notifId: string) => {
      await supabase.from('price_drop_notifications').update({ is_read: true }).eq('id', notifId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price-drops'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('price_drop_notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price-drops'] }),
  });

  const isWatching = (productId: string) =>
    watchesQuery.data?.some(w => w.product_id === productId) ?? false;

  const getWatch = (productId: string) =>
    watchesQuery.data?.find(w => w.product_id === productId) ?? null;

  return {
    watches: watchesQuery.data || [],
    watchesLoading: watchesQuery.isLoading,
    drops: dropsQuery.data || [],
    unreadCount: dropsQuery.data?.length || 0,
    addWatch,
    removeWatch,
    markRead,
    markAllRead,
    isWatching,
    getWatch,
  };
}
