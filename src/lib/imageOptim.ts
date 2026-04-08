/**
 * Optimise product image URLs for grid thumbnails.
 * Appends CDN-specific width parameters to reduce payload
 * from ~1MB originals to ~50KB thumbnails.
 */
export function thumbUrl(url: string, width = 480): string {
  if (!url) return url;

  try {
    // Shopify: replace dimension suffix e.g. _2048x. → _480x.
    if (url.includes('cdn.shopify.com')) {
      // Replace existing dimension params
      let optimised = url.replace(/_\d+x\d*\./g, `_${width}x.`);
      // If no dimension param was present, add before extension
      if (optimised === url) {
        optimised = url.replace(/(\.\w{3,4})(\?|$)/, `_${width}x$1$2`);
      }
      return optimised;
    }

    // Shopify via other CDNs (width= param)
    if (url.includes('width=')) {
      return url.replace(/width=\d+/, `width=${width}`);
    }

    // Nike / static CDN with t_default → use t_PDP_864_v1 for smaller
    if (url.includes('static.nike.com') && url.includes('t_default')) {
      return url.replace('t_default', 't_PDP_864_v1');
    }

    return url;
  } catch {
    return url;
  }
}
