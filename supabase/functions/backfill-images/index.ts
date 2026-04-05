import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HTTP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const REJECT_PATTERN = /-detail|-close|-texture|-zoom|thumb|_swatch|collage|runway|editorial|banner|logo|icon|sprite/i;
const JUNK_PATTERNS = [
  'doubleclick', '/pixel', '/tracking', 'googleads', 'googlesyndication',
  'facebook.com/tr', 'bat.bing.com', '.svg', '/icons/', 'logo', 'badge',
  'captcha', 'placeholder', 'swatch', '1x1', 'spacer', '.gif',
];

function isJunkUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return JUNK_PATTERNS.some(p => lower.includes(p)) || REJECT_PATTERN.test(lower);
}

async function fetchShopifyProducts(domain: string): Promise<Map<string, string[]>> {
  const productImages = new Map<string, string[]>();
  const maxPages = 2;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `${domain}/products.json?limit=250&page=${page}`;
      console.log(`[backfill] Fetching ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, {
        headers: { 'User-Agent': HTTP_UA, 'Accept': 'application/json' },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        console.warn(`[backfill] HTTP ${resp.status} for ${url}`);
        break;
      }

      const data = await resp.json();
      const items = data.products || [];
      if (items.length === 0) break;

      for (const item of items) {
        if (!item.handle) continue;
        const productUrl = `${domain}/products/${item.handle}`;
        const images: string[] = [];

        if (item.images && Array.isArray(item.images)) {
          for (const img of item.images.slice(0, 8)) {
            const src = typeof img === 'string' ? img : img.src;
            if (src && src.startsWith('http') && !isJunkUrl(src)) {
              images.push(src);
            }
          }
        }

        if (images.length > 1) {
          productImages.set(productUrl.toLowerCase(), images);
        }
      }

      if (items.length < 250) break;
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.warn(`[backfill] Error fetching from ${domain}:`, (err as Error).message);
      break;
    }
  }

  return productImages;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const targetDomain: string | null = body.domain || null;
    const batchLimit: number = body.limit || 200;

    if (!targetDomain) {
      return new Response(JSON.stringify({ error: 'domain is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch products needing backfill for this domain
    const { data: products, error: fetchErr } = await supabase
      .from('product_catalog')
      .select('id, product_url, image_url')
      .eq('is_active', true)
      .not('product_url', 'is', null)
      .ilike('product_url', `%${targetDomain}%`)
      .or('additional_images.is.null,additional_images.eq.{}')
      .limit(batchLimit);

    if (fetchErr) throw fetchErr;
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: 'No products need backfill for this domain', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract domain
    const domainMatch = products[0].product_url?.match(/^(https?:\/\/[^/]+)/);
    if (!domainMatch) throw new Error('Could not extract domain');
    const domain = domainMatch[1];

    console.log(`[backfill] ${domain}: ${products.length} products to process`);

    // Fetch Shopify data
    const shopifyImages = await fetchShopifyProducts(domain);
    console.log(`[backfill] Shopify returned ${shopifyImages.size} products with multiple images`);

    // Match and update
    let updated = 0;
    for (const product of products) {
      const key = product.product_url?.toLowerCase();
      if (!key) continue;

      const allImages = shopifyImages.get(key);
      if (!allImages || allImages.length <= 1) continue;

      const mainUrl = product.image_url?.toLowerCase() || '';
      const additional = allImages
        .filter((u: string) => u.toLowerCase() !== mainUrl)
        .slice(0, 5);

      if (additional.length === 0) continue;

      const { error: updateErr } = await supabase
        .from('product_catalog')
        .update({ additional_images: additional })
        .eq('id', product.id);

      if (updateErr) {
        console.warn(`[backfill] Update error for ${product.id}:`, updateErr.message);
        continue;
      }
      updated++;
    }

    console.log(`[backfill] ${domain}: updated ${updated}/${products.length}`);

    return new Response(JSON.stringify({
      domain,
      total_products: products.length,
      shopify_multi_image: shopifyImages.size,
      updated,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[backfill] Fatal error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
