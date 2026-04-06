import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HTTP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Known Shopify domains → their /products.json base
const SHOPIFY_DOMAINS: Record<string, string> = {
  'Essentials': 'https://fearofgod.com',
  'Fear of God': 'https://fearofgod.com',
  'Gymshark': 'https://www.gymshark.com',
  'True Classic': 'https://www.trueclassictees.com',
  'Faherty': 'https://fahertybrand.com',
  'Taylor Stitch': 'https://www.taylorstitch.com',
  'Marine Layer': 'https://www.marinelayer.com',
  'Grayers': 'https://www.grfrags.com',
  'AMIRI': 'https://www.amiri.com',
  'Fresh Clean Threads': 'https://freshcleantees.com',
  'Fresh Clean Tees': 'https://freshcleantees.com',
  'Outerknown': 'https://www.outerknown.com',
  'Roark': 'https://www.roark.com',
  'AllSaints': 'https://www.allsaints.com',
  'Represent': 'https://representclo.com',
  'Palace Skateboards': 'https://shop-usa.palaceskateboards.com',
  'Palace': 'https://shop-usa.palaceskateboards.com',
  'Daily Paper': 'https://www.dailypaperclothing.com',
  'Missing Since Thursday': 'https://missingsincethursday.com',
  'Eric Emanuel': 'https://www.ericemanuel.com',
  'Stüssy': 'https://www.stussy.com',
  'Supreme': 'https://www.supremenewyork.com',
  'Todd Snyder': 'https://www.toddsnyder.com',
  'Reiss': 'https://www.reiss.com',
  'Theory': 'https://www.theory.com',
  'Reformation': 'https://www.thereformation.com',
  'Acne Studios': 'https://www.acnestudios.com',
  "Rothy's": 'https://rothys.com',
  'Radial': 'https://www.radialofficial.com',
  'Public Rec 2.0': 'https://www.publicrec.com',
};

function stripHtml(html: string): string | null {
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > 15 ? plain.slice(0, 500) : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const body = await req.json().catch(() => ({}));
  const retailerFilter: string | null = body.retailer || null;
  const batchSize: number = body.batch_size || 200;

  // Get products missing descriptions
  let query = supabase
    .from('product_catalog')
    .select('id, product_url, retailer, name')
    .is('description', null)
    .eq('is_active', true)
    .order('retailer')
    .limit(batchSize);

  if (retailerFilter) {
    query = query.eq('retailer', retailerFilter);
  }

  const { data: products, error: fetchErr } = await query;
  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
  }

  if (!products || products.length === 0) {
    return new Response(JSON.stringify({ message: 'No products need description backfill', updated: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Group by retailer
  const byRetailer: Record<string, typeof products> = {};
  for (const p of products) {
    const r = p.retailer;
    if (!byRetailer[r]) byRetailer[r] = [];
    byRetailer[r].push(p);
  }

  let totalUpdated = 0;
  const retailerResults: Record<string, number> = {};

  for (const [retailer, items] of Object.entries(byRetailer)) {
    const shopifyBase = SHOPIFY_DOMAINS[retailer];
    
    if (shopifyBase) {
      // Fetch from Shopify API and match by product_url
      try {
        const allShopifyProducts: any[] = [];
        for (let page = 1; page <= 10; page++) {
          const url = `${shopifyBase}/products.json?limit=250&page=${page}`;
          const resp = await fetch(url, { headers: { 'User-Agent': HTTP_UA } });
          if (!resp.ok) break;
          const json = await resp.json();
          if (!json.products || json.products.length === 0) break;
          allShopifyProducts.push(...json.products);
          if (json.products.length < 250) break;
          // Rate limit respect
          await new Promise(r => setTimeout(r, 500));
        }

        console.log(`[backfill] ${retailer}: fetched ${allShopifyProducts.length} Shopify products`);

        // Build handle→description map
        const descMap = new Map<string, string>();
        for (const sp of allShopifyProducts) {
          if (sp.body_html) {
            const desc = stripHtml(sp.body_html);
            if (desc) {
              // Match by handle in URL
              if (sp.handle) descMap.set(sp.handle.toLowerCase(), desc);
              // Also store by title for fuzzy matching
              descMap.set(sp.title?.toLowerCase()?.trim(), desc);
            }
          }
        }

        let updated = 0;
        for (const item of items) {
          let desc: string | null = null;

          // Try matching by handle in product_url
          if (item.product_url) {
            try {
              const u = new URL(item.product_url);
              const segments = u.pathname.split('/').filter(Boolean);
              const handle = segments[segments.length - 1]?.toLowerCase();
              if (handle) desc = descMap.get(handle) || null;
            } catch {}
          }

          // Fallback: match by name
          if (!desc) {
            desc = descMap.get(item.name?.toLowerCase()?.trim()) || null;
          }

          if (desc) {
            const { error: upErr } = await supabase
              .from('product_catalog')
              .update({ description: desc })
              .eq('id', item.id);
            if (!upErr) updated++;
          }
        }

        retailerResults[retailer] = updated;
        totalUpdated += updated;
      } catch (err) {
        console.error(`[backfill] ${retailer} error:`, (err as Error).message);
        retailerResults[retailer] = 0;
      }
    } else {
      // Non-Shopify: try to extract description from product page via simple fetch
      let updated = 0;
      for (const item of items.slice(0, 20)) { // limit non-Shopify to 20 per batch
        if (!item.product_url) continue;
        try {
          const resp = await fetch(item.product_url, {
            headers: { 'User-Agent': HTTP_UA },
            redirect: 'follow',
          });
          if (!resp.ok) continue;
          const html = await resp.text();

          // Try meta description
          const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']{20,500})["']/i)
            || html.match(/<meta\s+content=["']([^"']{20,500})["']\s+name=["']description["']/i);
          
          // Try og:description
          const ogMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']{20,500})["']/i)
            || html.match(/<meta\s+content=["']([^"']{20,500})["']\s+property=["']og:description["']/i);

          // Try JSON-LD
          const ldMatch = html.match(/"description"\s*:\s*"([^"]{20,500})"/);

          const desc = metaMatch?.[1] || ogMatch?.[1] || ldMatch?.[1] || null;
          if (desc) {
            const clean = desc.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            if (clean.length > 15) {
              const { error: upErr } = await supabase
                .from('product_catalog')
                .update({ description: clean.slice(0, 500) })
                .eq('id', item.id);
              if (!upErr) updated++;
            }
          }

          await new Promise(r => setTimeout(r, 300)); // rate limit
        } catch {
          // skip
        }
      }
      retailerResults[retailer] = updated;
      totalUpdated += updated;
    }
  }

  return new Response(JSON.stringify({
    message: `Backfilled ${totalUpdated} descriptions`,
    total_updated: totalUpdated,
    by_retailer: retailerResults,
    products_checked: products.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
