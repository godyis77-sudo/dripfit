import { useState, useEffect, useCallback, useRef } from 'react';
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
}

// Map app-facing category keys to actual DB category values
const CATEGORY_MAP: Record<string, string[]> = {
  // Broad categories map to all sub-categories
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
  activewear: ['activewear'],
  loungewear: ['loungewear'],
  underwear: ['underwear'],
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

export function useProductCatalog(
  category?: string,
  brand?: string,
  seed?: number,
  gender?: string,
  genre?: string,
  fitProfile?: string,
) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  // Stable random seed — generated once per hook instance to prevent flickering on re-fetch
  const stableSeedRef = useRef(seed ?? Math.floor(Math.random() * 100000));
  const fetchRequestIdRef = useRef(0);

  const fetchProducts = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current;
    setLoading(true);

    try {
      let query = supabase
        .from('product_catalog')
        .select('id, brand, retailer, category, name, image_url, product_url, price_cents, currency, tags, presentation, image_confidence, gender, fit_profile, fabric_composition, style_genre')
        .eq('is_active', true)
        .not('image_url', 'is', null)
        .gte('image_confidence', 0.05)
        .order('image_confidence', { ascending: false })
        .order('id', { ascending: true })
        .limit(500);

      if (category) {
        const mapped = CATEGORY_MAP[category];
        if (mapped && mapped.length > 0) {
          query = query.in('category', mapped);
        } else {
          query = query.eq('category', category);
        }
      }
      if (brand) query = query.eq('brand', brand);
      if (gender && gender !== 'all') {
        query = query.in('gender', [gender, 'unisex']);
      }
      if (genre) {
        query = query.eq('style_genre', genre);
      }
      if (fitProfile) {
        query = query.contains('fit_profile', [fitProfile]);
      }

      // For swimwear, only show model shots (forward-facing body photos)
      const swimCategories = ['swimwear', 'underwear', 'lingerie'];
      const effectiveCategory = category?.toLowerCase() ?? '';
      if (swimCategories.includes(effectiveCategory)) {
        query = query.eq('presentation', 'model_shot').gte('image_confidence', 0.15);
      }

      const { data } = await query;

      if (requestId !== fetchRequestIdRef.current) return;

      if (data) {
        // Filter out junk URLs and deduplicate
        const JUNK_PATTERNS = [
          'down_for_maintenance', 'navigation', 'imagesother', 'chip/goods',
          'topper', 'courtesypage', 'navi/image', 'lineup/', 'width=36',
          'new-stores', 'miffy', 'placeholder', 'dress_toppers', 'dress-topper',
          'share-image', 'flags/', 'entrance/assets', '/icons/', 'swatch',
          'pixel', 'spacer', 'badge', 'app-store', 'download-on',
          '.gif', '1x1', 'tracking', 'promo',
          'paymentmethods', 'asos-finance', 'klarna',
          'visa.png', 'mastercard.png', 'paypal.png', 'amex.png',
          'afterpay', 'discover.png', 'dinersclub', 'apple-pay',
          '/navi/', 'pm_',
          'doubleclick.net', 'ad.doubleclick', 'googlesyndication', 'googleadservices',
          'facebook.com/tr', 'criteo', 'taboola',
          'static.zara.net',
          '/risk/challenge', 'captcha_type',
        ];
        const seen = new Set<string>();
        const cleaned = (data as unknown as CatalogProduct[]).filter(p => {
          if (!p.image_url || p.image_url.trim() === '') return false;
          const normalizedUrl = p.image_url.trim().toLowerCase();
          if (JUNK_PATTERNS.some(pat => normalizedUrl.includes(pat))) return false;
          if (seen.has(normalizedUrl)) return false;
          seen.add(normalizedUrl);
          return true;
        });

        const shuffleSeed = seed ?? stableSeedRef.current;
        setProducts(seededShuffle(cleaned, shuffleSeed));
      } else {
        setProducts([]);
      }
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [category, brand, seed, gender, genre, fitProfile]);

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
