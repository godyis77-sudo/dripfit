// Backfill additional product images (photo gallery) by scraping product pages.
// Targets active catalog rows where additional_images is empty/null.
// Uses Shopify products.json when available (free + fast), falls back to Firecrawl HTML scrape.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HTTP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const SHOPIFY_DOMAINS: Record<string, string> = {
  'Essentials': 'https://fearofgod.com',
  'Fear of God': 'https://fearofgod.com',
  'Gymshark': 'https://www.gymshark.com',
  'True Classic': 'https://trueclassictees.com',
  'Faherty': 'https://www.fahertybrand.com',
  'Taylor Stitch': 'https://www.taylorstitch.com',
  'Marine Layer': 'https://www.marinelayer.com',
  'AMIRI': 'https://www.amiri.com',
  'Outerknown': 'https://www.outerknown.com',
  'AllSaints': 'https://www.allsaints.com',
  'Represent': 'https://representclo.com',
  'Palace': 'https://shop-usa.palaceskateboards.com',
  'Daily Paper': 'https://www.dailypaperclothing.com',
  'Eric Emanuel': 'https://www.ericemanuel.com',
  'Stüssy': 'https://www.stussy.com',
  'Todd Snyder': 'https://www.toddsnyder.com',
  'Reiss': 'https://www.reiss.com',
  'Theory': 'https://www.theory.com',
  'Reformation': 'https://www.thereformation.com',
  'Acne Studios': 'https://www.acnestudios.com',
  "Rothy's": 'https://rothys.com',
};

type Item = { id: string; product_url: string | null; name: string; retailer: string; image_url: string };

// Filter out junk image URLs (logos, badges, payment methods, swatches, etc.)
const JUNK_PATTERNS = [
  /placeholder/i, /sprite/i, /\.svg(\?|$)/i, /1x1/i, /pixel/i, /spacer/i,
  /klarna|afterpay|apple-?pay|paypal|amazonpay/i,
  /badge|logo|favicon|app-?store|play-?store/i,
  /tracking|analytics|doubleclick|criteo|googlesyndication/i,
  /swatch/i, /thumb_50|thumb_100|_50x|_100x/i,
];

function isJunkImage(url: string): boolean {
  if (!url) return true;
  if (!/^https?:\/\//i.test(url)) return false; // protocol-relative — we'll fix later
  return JUNK_PATTERNS.some(re => re.test(url));
}

function normalizeUrl(raw: string, baseUrl: string): string | null {
  try {
    if (!raw) return null;
    let u = raw.trim().replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    if (u.startsWith('/')) {
      const b = new URL(baseUrl);
      u = `${b.protocol}//${b.host}${u}`;
    }
    new URL(u); // throws if invalid
    return u;
  } catch {
    return null;
  }
}

function dedupeAndCap(urls: string[], primary: string, max = 6): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  // Strip query strings + size suffixes for dedup key
  const keyOf = (u: string) => u.split('?')[0].replace(/_\d+x\d+/i, '').replace(/_\d{3,4}\./i, '.').toLowerCase();
  if (primary) seen.add(keyOf(primary));
  for (const u of urls) {
    const k = keyOf(u);
    if (seen.has(k)) continue;
    seen.add(k);
    result.push(u);
    if (result.length >= max) break;
  }
  return result;
}

async function fetchShopifyImages(retailer: string): Promise<Map<string, string[]>> {
  const base = SHOPIFY_DOMAINS[retailer];
  if (!base) return new Map();
  const map = new Map<string, string[]>();
  try {
    for (let page = 1; page <= 10; page++) {
      const url = `${base}/products.json?limit=250&page=${page}`;
      const resp = await fetch(url, { headers: { 'User-Agent': HTTP_UA }, signal: AbortSignal.timeout(10000) });
      if (!resp.ok) break;
      const json = await resp.json();
      if (!json.products?.length) break;
      for (const p of json.products) {
        const imgs: string[] = (p.images || [])
          .map((im: any) => im?.src)
          .filter((s: any) => typeof s === 'string' && !isJunkImage(s));
        if (imgs.length === 0) continue;
        if (p.handle) map.set(p.handle.toLowerCase(), imgs);
        if (p.title) map.set(p.title.toLowerCase().trim(), imgs);
      }
      if (json.products.length < 250) break;
      await new Promise(r => setTimeout(r, 400));
    }
  } catch (err) {
    console.warn(`[images] Shopify fetch failed for ${retailer}:`, (err as Error).message);
  }
  return map;
}

async function scrapeImagesViaFirecrawl(item: Item): Promise<string[]> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey || !item.product_url) return [];
  try {
    const resp = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: item.product_url,
        formats: ['html'],
        onlyMainContent: true,
        waitFor: 1200,
        timeout: 30000,
      }),
      signal: AbortSignal.timeout(35000),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.success) return [];
    const html: string = data.data?.html || data.html || '';
    return extractImagesFromHtml(html, item.product_url, item.image_url);
  } catch (err) {
    console.log(`[images] firecrawl ERR ${item.id}: ${(err as Error).message}`);
    return [];
  }
}

async function scrapeImagesDirect(item: Item): Promise<string[]> {
  if (!item.product_url) return [];
  try {
    const resp = await fetch(item.product_url, {
      headers: { 'User-Agent': HTTP_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    return extractImagesFromHtml(html, item.product_url, item.image_url);
  } catch {
    return [];
  }
}

function extractImagesFromHtml(html: string, pageUrl: string, primary: string): string[] {
  const candidates = new Set<string>();

  // 1. og:image / twitter:image
  const ogRe = /<meta\s+property=["'](?:og:image(?::secure_url)?|twitter:image)["']\s+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = ogRe.exec(html))) candidates.add(m[1]);

  // 2. JSON-LD product image arrays
  const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ldRe.exec(html))) {
    try {
      const json = JSON.parse(m[1].trim());
      const collect = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) { node.forEach(collect); return; }
        if (typeof node === 'object') {
          if (node.image) {
            if (typeof node.image === 'string') candidates.add(node.image);
            else if (Array.isArray(node.image)) node.image.forEach((x: any) => typeof x === 'string' ? candidates.add(x) : x?.url && candidates.add(x.url));
            else if (node.image.url) candidates.add(node.image.url);
          }
          Object.values(node).forEach(collect);
        }
      };
      collect(json);
    } catch { /* ignore */ }
  }

  // 3. Product gallery <img> tags — heuristic: img with src/data-src in product context
  const imgRe = /<img[^>]+(?:src|data-src|data-zoom-image|data-large-image|data-srcset|srcset)=["']([^"']+)["'][^>]*>/gi;
  while ((m = imgRe.exec(html))) {
    // Take the first URL out of srcset if multiple
    const first = m[1].split(',')[0].trim().split(' ')[0];
    candidates.add(first);
  }

  // Normalize, filter, dedupe
  const normalized: string[] = [];
  for (const raw of candidates) {
    const n = normalizeUrl(raw, pageUrl);
    if (!n) continue;
    if (isJunkImage(n)) continue;
    normalized.push(n);
  }
  return dedupeAndCap(normalized, primary, 6);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const body = await req.json().catch(() => ({}));
  const retailerFilter: string | null = body.retailer || null;
  const batchSize: number = body.batch_size || 150;
  const useFirecrawl: boolean = body.use_firecrawl !== false; // default ON
  const background: boolean = body.background === true;

  // Find products with empty additional_images
  let query = supabase
    .from('product_catalog')
    .select('id, product_url, retailer, name, image_url, additional_images')
    .eq('is_active', true)
    .not('product_url', 'is', null)
    .order('retailer')
    .limit(batchSize);

  if (retailerFilter) query = query.eq('retailer', retailerFilter);

  const { data: rows, error: fetchErr } = await query;
  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
  }

  // Filter to only those genuinely missing additional images
  const products: Item[] = (rows || [])
    .filter((r: any) => !Array.isArray(r.additional_images) || r.additional_images.length === 0)
    .map((r: any) => ({
      id: r.id,
      product_url: r.product_url,
      name: r.name,
      retailer: r.retailer,
      image_url: r.image_url,
    }));

  if (products.length === 0) {
    return new Response(JSON.stringify({ message: 'No products need image backfill', updated: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const byRetailer: Record<string, Item[]> = {};
  for (const p of products) {
    (byRetailer[p.retailer] ||= []).push(p);
  }

  const runWork = async () => {
    let totalUpdated = 0;
    const results: Record<string, number> = {};

    for (const [retailer, items] of Object.entries(byRetailer)) {
      let updated = 0;
      const shopifyMap = await fetchShopifyImages(retailer);

      // Process in concurrent batches
      const CONCURRENCY = 8;
      for (let i = 0; i < items.length; i += CONCURRENCY) {
        const batch = items.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (item) => {
          let imgs: string[] = [];

          // Try Shopify first
          if (shopifyMap.size > 0 && item.product_url) {
            try {
              const u = new URL(item.product_url);
              const handle = u.pathname.split('/').filter(Boolean).pop()?.toLowerCase();
              if (handle && shopifyMap.has(handle)) imgs = shopifyMap.get(handle)!;
            } catch { /* ignore */ }
            if (imgs.length === 0 && item.name) {
              imgs = shopifyMap.get(item.name.toLowerCase().trim()) || [];
            }
          }

          // Fall back to direct HTML scrape
          if (imgs.length === 0) {
            imgs = await scrapeImagesDirect(item);
          }

          // Final fallback: Firecrawl (handles JS-rendered pages, anti-bot)
          if (imgs.length === 0 && useFirecrawl) {
            imgs = await scrapeImagesViaFirecrawl(item);
          }

          // Filter out the primary image and cap to 5 additional
          const additional = dedupeAndCap(imgs, item.image_url, 6).filter(u => u !== item.image_url).slice(0, 5);
          if (additional.length === 0) return;

          const { error } = await supabase
            .from('product_catalog')
            .update({ additional_images: additional })
            .eq('id', item.id);
          if (!error) updated++;
        }));
      }

      results[retailer] = updated;
      totalUpdated += updated;
      console.log(`[images] ${retailer}: ${updated}/${items.length}`);
    }

    console.log(`[images] DONE total=${totalUpdated}`, results);
    return { totalUpdated, results };
  };

  if (background) {
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(runWork());
    return new Response(JSON.stringify({
      message: 'Image backfill started in background',
      products_queued: products.length,
      retailers: Object.keys(byRetailer),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { totalUpdated, results } = await runWork();
  return new Response(JSON.stringify({
    message: `Backfilled ${totalUpdated} product galleries`,
    total_updated: totalUpdated,
    by_retailer: results,
    products_checked: products.length,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
