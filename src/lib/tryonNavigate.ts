import { supabase } from '@/integrations/supabase/client';
import type { NavigateFunction } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';

/** Normalize a product URL for fuzzy matching against product_catalog */
const normalizeProductUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
  }
};

/**
 * Resolve the best clothing image for a product URL by checking the catalog,
 * then navigate to /tryon with the image pre-populated.
 */
export async function navigateToTryOn(
  navigate: (path: string, opts?: any) => void,
  opts: {
    productUrl?: string;
    fallbackClothingImageUrl?: string;
    source?: string;
  }
) {
  const { productUrl, fallbackClothingImageUrl, source = 'unknown' } = opts;
  let clothingImageUrl = fallbackClothingImageUrl;

  if (productUrl) {
    try {
      const normalizedUrl = normalizeProductUrl(productUrl);
      const { data } = await supabase
        .from('product_catalog')
        .select('image_url')
        .ilike('product_url', `${normalizedUrl}%`)
        .eq('is_active', true)
        .limit(1);

      if (data?.[0]?.image_url) clothingImageUrl = data[0].image_url;
    } catch {
      // keep fallback
    }
  }

  trackEvent('tryon_navigate', { source, productUrl: productUrl || '' });
  navigate('/tryon', {
    state: {
      productUrl,
      clothingImageUrl: clothingImageUrl || undefined,
    },
  });
}
