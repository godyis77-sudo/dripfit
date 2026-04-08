/**
 * Optimize CDN image URLs for thumbnail display.
 * Rewrites Shopify, Vuori, Salomon, and similar CDN URLs
 * to request a smaller image, reducing bandwidth significantly.
 */

const SHOPIFY_SIZE_RE = /(_\d+x\d*|\d*x\d+_)/;
const SHOPIFY_EXT_RE = /\.(jpg|jpeg|png|webp)(\?|$)/i;

/**
 * Return an optimized thumbnail URL for a product image.
 * @param url  Original image URL
 * @param width Target pixel width (default 400 — good for 2-col grid on 2x screens)
 */
export function thumbnailUrl(url: string | null | undefined, width = 400): string {
  if (!url) return '';

  try {
    // Shopify CDN: rewrite _WIDTHx or append before extension
    if (url.includes('cdn.shopify.com') || url.includes('.myshopify.com')) {
      if (SHOPIFY_SIZE_RE.test(url)) {
        return url.replace(SHOPIFY_SIZE_RE, `_${width}x`);
      }
      return url.replace(SHOPIFY_EXT_RE, `_${width}x.$1$2`);
    }

    // Generic width parameter (Vuori, Salomon, etc.)
    if (/[?&]width=\d+/.test(url)) {
      return url.replace(/([?&]width=)\d+/, `$1${width}`);
    }

    // Cloudinary
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
    }
  } catch {
    // Return original on any parse error
  }

  return url;
}
