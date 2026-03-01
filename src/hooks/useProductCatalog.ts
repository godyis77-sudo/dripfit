import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CatalogProduct {
  id: string;
  brand: string;
  retailer: string;
  category: string;
  name: string;
  image_url: string;
  product_url: string | null;
  price_cents: number | null;
  currency: string;
  tags: string[];
}

// Map app-facing category keys to actual DB category values
const CATEGORY_MAP: Record<string, string[]> = {
  top: ['tops', 'top'],
  bottom: ['bottoms', 'bottom'],
  dress: ['dresses', 'dress'],
  outerwear: ['outerwear'],
  shoes: ['footwear', 'shoes'],
  bags: ['bags', 'accessories'],
  hats: ['hats', 'accessories'],
  jewelry: ['jewelry', 'accessories'],
  sunglasses: ['sunglasses', 'accessories'],
  necklace: ['jewelry', 'accessories'],
  earrings: ['jewelry', 'accessories'],
  bracelet: ['jewelry', 'accessories'],
  watch: ['jewelry', 'accessories'],
  full: ['tops', 'dresses', 'outerwear', 'other'],
  accessories: ['accessories', 'footwear', 'bags', 'hats', 'jewelry', 'sunglasses'],
};

export function useProductCatalog(category?: string, brand?: string) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('product_catalog')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30);

    if (category) {
      const mapped = CATEGORY_MAP[category];
      if (mapped && mapped.length > 0) {
        query = query.in('category', mapped);
      } else {
        query = query.eq('category', category);
      }
    }
    if (brand) query = query.eq('brand', brand);

    const { data } = await query;
    if (data) setProducts(data as unknown as CatalogProduct[]);
    setLoading(false);
  }, [category, brand]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
}

export function usePreferredBrands() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from('user_preferred_brands')
      .select('brand_name')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setBrands(data.map((d: any) => d.brand_name));
        setLoading(false);
      });
  }, [user]);

  const addBrand = async (brandName: string) => {
    if (!user || brands.includes(brandName)) return;
    const { error } = await supabase.from('user_preferred_brands').insert({
      user_id: user.id,
      brand_name: brandName,
    } as any);
    if (!error) setBrands(prev => [...prev, brandName]);
    return !error;
  };

  const removeBrand = async (brandName: string) => {
    if (!user) return;
    await supabase
      .from('user_preferred_brands')
      .delete()
      .eq('user_id', user.id)
      .eq('brand_name', brandName);
    setBrands(prev => prev.filter(b => b !== brandName));
  };

  return { brands, loading, addBrand, removeBrand };
}

// Master brand list for search/select
export const MASTER_BRANDS = [
  // Luxury
  'Gucci', 'Louis Vuitton', 'Prada', 'Balenciaga', 'Dior',
  'Burberry', 'Versace', 'Saint Laurent', 'Givenchy', 'Fendi',
  // Streetwear
  'Supreme', 'Off-White', 'Stüssy', 'A Bathing Ape', 'Palace',
  'Fear of God', 'Kith', 'Essentials', 'Corteiz', 'Trapstar',
  // Existing retailers
  'SHEIN', 'Macys', 'Gap', 'Nordstrom', 'JCPenney',
  'Lululemon', 'Zara', 'H&M', 'Aritzia', 'Simons',
  // Popular
  'Nike', 'Adidas', 'Uniqlo', 'ASOS', 'Mango', 'Revolve',
  'Fashion Nova', 'PrettyLittleThing', 'Anthropologie', 'Free People',
] as const;
