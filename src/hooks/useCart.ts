import { useState, useEffect, useCallback } from 'react';
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

const STORAGE_KEY = 'drip_cart';
const CART_UPDATED_EVENT = 'drip_cart_updated';

export function useCart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const storageKey = user ? `${STORAGE_KEY}_${user.id}` : null;

  const readCart = useCallback((): CartItem[] => {
    if (!storageKey) {
      // no user yet
      return [];
    }
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      // readCart silent
      return parsed;
    } catch {
      return [];
    }
  }, [storageKey]);

  const loadCart = useCallback(() => {
    const cartItems = readCart();
    // loadCart
    setItems(cartItems);
    setLoading(false);
  }, [readCart]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    const handleCartUpdated = () => loadCart();
    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    return () => window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
  }, [loadCart]);

  const saveCart = useCallback((newItems: CartItem[]) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(newItems));
    } catch (e) {
      console.error('[cart] localStorage write failed', e);
    }
    setItems(newItems);
    // Notify other hook instances on the same page
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  }, [storageKey]);

  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'created_at'>) => {
    if (!user) {
      toast({ title: 'Sign in to add to cart', variant: 'destructive' });
      return;
    }

    const current = readCart();
    const exists = current.some(i => i.post_id === item.post_id);
    if (exists) {
      toast({ title: 'Already in cart' });
      return;
    }

    const newItem: CartItem = {
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const updated = [newItem, ...current];
    saveCart(updated);
    trackEvent('cart_add', { post_id: item.post_id });
    toast({ title: '🛒 Added to cart' });
  }, [user, readCart, saveCart, toast]);

  const removeFromCart = useCallback((postId: string) => {
    const updated = readCart().filter(i => i.post_id !== postId);
    saveCart(updated);
    trackEvent('cart_remove', { post_id: postId });
    toast({ title: 'Removed from cart' });
  }, [readCart, saveCart, toast]);

  const clearCart = useCallback(() => {
    saveCart([]);
    trackEvent('cart_clear');
  }, [saveCart]);

  const isInCart = useCallback((postId: string) => {
    return items.some(i => i.post_id === postId);
  }, [items]);

  return { items, loading, addToCart, removeFromCart, clearCart, isInCart, count: items.length };
}
