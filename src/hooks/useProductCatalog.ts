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
  watch: ['jewelry'],
  watches: ['jewelry'],
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

export function useProductCatalog(category?: string, brand?: string, seed?: number, gender?: string) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  // Stable random seed — generated once per hook instance to prevent flickering on re-fetch
  const stableSeedRef = useRef(seed ?? Math.floor(Math.random() * 100000));

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('product_catalog')
      .select('id, brand, retailer, category, name, image_url, product_url, price_cents, currency, tags, presentation, image_confidence, gender')
      .eq('is_active', true)
      .not('image_url', 'is', null)
      .order('image_confidence', { ascending: false })
      .limit(1000);

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

    const { data } = await query;
    if (data) {
      // Filter out junk URLs and low-quality entries
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
      ];
      const HARD_MIN_CONFIDENCE = 0.05;
      const PREFERRED_MIN_CONFIDENCE = 0.15;
      const seen = new Set<string>();
      const cleaned = (data as unknown as CatalogProduct[]).filter(p => {
        if (!p.image_url || p.image_url.trim() === '') return false;
        const normalizedUrl = p.image_url.trim().toLowerCase();
        if (JUNK_PATTERNS.some(pat => normalizedUrl.includes(pat))) return false;

        const conf = p.image_confidence;
        if (typeof conf === 'number' && conf < HARD_MIN_CONFIDENCE) return false;

        // Deduplicate by image URL (case-insensitive)
        if (seen.has(normalizedUrl)) return false;
        seen.add(normalizedUrl);
        return true;
      });

      // Prefer high-confidence entries first to avoid blank / banner-like results.
      const finalPool = cleaned;

      const shuffleSeed = seed ?? stableSeedRef.current;
      setProducts(seededShuffle(finalPool, shuffleSeed));
    }
    setLoading(false);
  }, [category, brand, seed, gender]);

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
  // Mass-market & fast fashion
  'SHEIN', 'Zara', 'H&M', 'Gap', 'Old Navy', 'Banana Republic',
  'Uniqlo', 'Mango', 'Forever 21', 'Boohoo', 'PrettyLittleThing',
  'Fashion Nova', 'Target', 'Topshop',
  // Department & multi-brand
  'Nordstrom', 'ASOS', 'Revolve', 'Amazon Fashion', 'Urban Outfitters',
  'Abercrombie & Fitch', 'J.Crew',
  // Athletic & activewear
  'Nike', 'Adidas', 'Puma', 'Lululemon',
] as const;
