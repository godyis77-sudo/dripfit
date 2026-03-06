import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

export interface CartItem {
  id: string;
  post_id: string;
  image_url: string;
  caption: string | null;
  product_urls: string[] | null;
  clothing_photo_url: string;
  created_at: string;
  brand?: string | null;
}

export function useCart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = 'drip_cart';

  // Load cart from localStorage (keyed by user)
  const loadCart = useCallback(() => {
    if (!user) { setItems([]); setLoading(false); return; }
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadCart(); }, [loadCart]);

  const saveCart = useCallback((newItems: CartItem[]) => {
    if (!user) return;
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newItems));
    setItems(newItems);
  }, [user]);

  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'created_at'>) => {
    if (!user) { toast({ title: 'Sign in to add to cart', variant: 'destructive' }); return; }
    const exists = items.some(i => i.post_id === item.post_id);
    if (exists) { toast({ title: 'Already in cart' }); return; }
    const newItem: CartItem = {
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    const updated = [newItem, ...items];
    saveCart(updated);
    trackEvent('cart_add', { post_id: item.post_id });
    toast({ title: '🛒 Added to cart' });
  }, [user, items, saveCart, toast]);

  const removeFromCart = useCallback((postId: string) => {
    const updated = items.filter(i => i.post_id !== postId);
    saveCart(updated);
    trackEvent('cart_remove', { post_id: postId });
    toast({ title: 'Removed from cart' });
  }, [items, saveCart, toast]);

  const clearCart = useCallback(() => {
    saveCart([]);
    trackEvent('cart_clear');
  }, [saveCart]);

  const isInCart = useCallback((postId: string) => {
    return items.some(i => i.post_id === postId);
  }, [items]);

  return { items, loading, addToCart, removeFromCart, clearCart, isInCart, count: items.length };
}
