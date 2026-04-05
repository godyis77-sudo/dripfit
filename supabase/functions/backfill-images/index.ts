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
  const maxPages = 4;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `${domain}/products.json?limit=250&page=${page}`;
      console.log(`[backfill] Fetching ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
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
          // Store all images except the first (which is likely already the main image)
          productImages.set(productUrl.toLowerCase(), images);
        }
      }

      if (items.length < 250) break;
      await new Promise(r => setTimeout(r, 350));
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

    // Get domains to backfill — optionally filter by domain
    const body = await req.json().catch(() => ({}));
    const targetDomain: string | null = body.domain || null;
    const dryRun: boolean = body.dry_run || false;

    // Get unique Shopify domains from existing products
    const { data: products, error: fetchErr } = await supabase
      .from('product_catalog')
      .select('id, product_url, image_url')
      .eq('is_active', true)
      .not('product_url', 'is', null)
      .like('product_url', '%/products/%')
      .or('additional_images.is.null,additional_images.eq.{}')
      .limit(1000);

    if (fetchErr) throw fetchErr;
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: 'No products need backfill', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group by domain
    const byDomain = new Map<string, typeof products>();
    for (const p of products) {
      const match = p.product_url?.match(/^(https?:\/\/[^/]+)/);
      if (!match) continue;
      const domain = match[1];
      if (targetDomain && !domain.includes(targetDomain)) continue;
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain)!.push(p);
    }

    console.log(`[backfill] Processing ${byDomain.size} domains, ${products.length} products`);

    let totalUpdated = 0;
    const domainResults: Record<string, number> = {};

    for (const [domain, domainProducts] of byDomain) {
      try {
        const shopifyImages = await fetchShopifyProducts(domain);
        let domainUpdated = 0;

        for (const product of domainProducts) {
          const key = product.product_url?.toLowerCase();
          if (!key) continue;

          const allImages = shopifyImages.get(key);
          if (!allImages || allImages.length <= 1) continue;

          // Find the main image and get the rest as additional
          const mainUrl = product.image_url?.toLowerCase() || '';
          const additional = allImages
            .filter(u => u.toLowerCase() !== mainUrl)
            .slice(0, 5);

          if (additional.length === 0) continue;

          if (!dryRun) {
            const { error: updateErr } = await supabase
              .from('product_catalog')
              .update({ additional_images: additional })
              .eq('id', product.id);

            if (updateErr) {
              console.warn(`[backfill] Update error for ${product.id}:`, updateErr.message);
              continue;
            }
          }

          domainUpdated++;
        }

        totalUpdated += domainUpdated;
        domainResults[domain] = domainUpdated;
        console.log(`[backfill] ${domain}: updated ${domainUpdated}/${domainProducts.length}`);

        // Rate limit between domains
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.warn(`[backfill] Skipping ${domain}:`, (err as Error).message);
        domainResults[domain] = -1;
      }
    }

    return new Response(JSON.stringify({
      message: dryRun ? 'Dry run complete' : 'Backfill complete',
      total_updated: totalUpdated,
      domains: domainResults,
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
