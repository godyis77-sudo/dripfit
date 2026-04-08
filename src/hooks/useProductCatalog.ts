import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  presentation?: string | null;
  image_confidence?: number | null;
  gender?: string | null;
  fit_profile?: string[] | null;
  fabric_composition?: string[] | null;
  style_genre?: string | null;
  additional_images?: string[] | null;
  description?: string | null;
}

// Map app-facing category keys to actual DB category values
const CATEGORY_MAP: Record<string, string[]> = {
  tops: ['tops', 'top', 't-shirts', 'shirts', 'hoodies', 'polos', 'sweaters'],
  top: ['tops', 'top', 't-shirts', 'shirts', 'hoodies', 'polos', 'sweaters'],
  't-shirts': ['t-shirts'],
  shirts: ['shirts'],
  hoodies: ['hoodies'],
  polos: ['polos'],
  sweaters: ['sweaters'],
  bottom: ['bottoms', 'bottom', 'jeans', 'pants', 'shorts', 'skirts', 'leggings'],
  bottoms: ['bottoms', 'bottom', 'jeans', 'pants', 'shorts', 'skirts', 'leggings'],
  jeans: ['jeans'],
  pants: ['pants'],
  shorts: ['shorts'],
  skirts: ['skirts'],
  leggings: ['leggings'],
  dress: ['dresses', 'dress', 'jumpsuits'],
  dresses: ['dresses', 'dress', 'jumpsuits'],
  jumpsuits: ['jumpsuits'],
  outerwear: ['outerwear', 'jackets', 'coats', 'blazers', 'vests'],
  jackets: ['jackets'],
  coats: ['coats'],
  blazers: ['blazers'],
  vests: ['vests'],
  shoes: ['shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'loafers', 'heels'],
  footwear: ['shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'loafers', 'heels'],
  sneakers: ['sneakers'],
  boots: ['boots'],
  sandals: ['sandals'],
  loafers: ['loafers'],
  heels: ['heels'],
  bags: ['bags'],
  hats: ['hats'],
  jewelry: ['jewelry', 'watches'],
  necklace: ['jewelry'],
  earrings: ['jewelry'],
  bracelet: ['jewelry'],
  ring: ['jewelry'],
  watch: ['watches', 'jewelry'],
  watches: ['watches', 'jewelry'],
  sunglasses: ['sunglasses'],
  belts: ['belts'],
  scarves: ['scarves'],
  swimwear: ['swimwear'],
  'bikini-top': ['swimwear'],
  'bikini-bottom': ['swimwear'],
  'one-piece': ['swimwear'],
  activewear: ['activewear'],
  loungewear: ['loungewear'],
  
  accessories: ['accessories', 'bags', 'hats', 'jewelry', 'watches', 'sunglasses', 'belts', 'scarves'],
  other: ['other'],
  full: ['tops', 'top', 't-shirts', 'shirts', 'hoodies', 'dresses', 'dress', 'outerwear', 'jackets', 'coats'],
};

// Shuffle array with a simple seed-based PRNG for deterministic but varied results
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface CatalogFilters {
  category?: string;
  brand?: string;
  gender?: string;
  genre?: string;
  fitProfile?: string;
  retailer?: string;
  priceMin?: number;
  priceMax?: number;
}

async function fetchCatalogProducts(filters: CatalogFilters): Promise<CatalogProduct[]> {
  const { category, brand, gender, genre, fitProfile, retailer, priceMin, priceMax } = filters;

  // Resolve categories
  let categories: string[] | null = null;
  if (category && category !== 'all') {
    const mapped = CATEGORY_MAP[category];
    categories = mapped && mapped.length > 0 ? mapped : [category];
  }

  // Swimwear-specific overrides
  const swimCategories = ['swimwear'];
  const isSwim = swimCategories.includes(category?.toLowerCase() ?? '');

  const params: Record<string, unknown> = {
    p_categories: categories,
    p_brand: brand || null,
    p_gender: gender && gender !== 'all' ? gender : null,
    p_genre: genre || null,
    p_fit_profile: fitProfile || null,
    p_retailer: retailer || null,
    p_price_min_cents: priceMin != null ? Math.round(priceMin * 100) : null,
    p_price_max_cents: priceMax != null ? Math.round(priceMax * 100) : null,
    p_min_confidence: isSwim ? 0.15 : 0.05,
    p_presentation: isSwim ? 'model_shot' : null,
    p_limit: brand ? 1000 : (category && category !== 'all' ? 500 : 2000),
    p_offset: 0,
  };

  const { data, error } = await supabase.rpc('get_filtered_catalog', params as any);

  if (error) {
    console.error('Catalog RPC error:', error);
    return [];
  }

  // Deduplicate by image_url (still needed for edge cases)
  const seen = new Set<string>();
  return ((data as unknown as CatalogProduct[]) ?? []).filter(p => {
    if (!p.image_url) return false;
    const key = p.image_url.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useProductCatalog(
  category?: string,
  brand?: string,
  seed?: number,
  gender?: string,
  genre?: string,
  fitProfile?: string,
  enabled: boolean = true,
) {
  // Stable random seed — generated once per hook instance
  const stableSeedRef = useRef(seed ?? Math.floor(Math.random() * 100000));

  const filters: CatalogFilters = {
    category,
    brand,
    gender,
    genre,
    fitProfile,
  };

  const queryKey = ['product-catalog', category ?? 'all', brand ?? '', gender ?? '', genre ?? '', fitProfile ?? ''];

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchCatalogProducts(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    enabled,
  });

  // Apply deterministic shuffle
  const shuffleSeed = seed ?? stableSeedRef.current;
  const products = data ? seededShuffle(data, shuffleSeed) : [];

  return { products, loading: isLoading, refetch };
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
  'A Bathing Ape', 'Abercrombie & Fitch', 'Adidas', 'Amazon Fashion', 'ASOS',
  'Balenciaga', 'Banana Republic', 'Boohoo', 'Burberry', 'Corteiz',
  'Dior', 'Essentials', 'Fashion Nova', 'Fear of God', 'Fendi',
  'Forever 21', 'Gap', 'Givenchy', 'Gucci', 'H&M',
  'J.Crew', 'Kith', 'Louis Vuitton', 'Lululemon', 'Mango',
  'Nike', 'Nordstrom', 'Off-White', 'Old Navy', 'Palace',
  'Prada', 'PrettyLittleThing', 'Puma', 'Revolve', 'Saint Laurent',
  'SHEIN', 'Stüssy', 'Supreme', 'Target', 'Topshop',
  'Trapstar', 'Uniqlo', 'Urban Outfitters', 'Versace', 'Zara',
] as const;
