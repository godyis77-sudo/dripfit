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
  'Grayers': 'https://www.grayers.com',
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
  'Dr. Martens': 'https://www.drmartens.com',
};

function stripHtml(html: string): string | null {
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > 15 ? plain.slice(0, 500) : null;
}

type BackfillItem = { id: string; product_url: string | null; name: string; retailer: string };

async function generateDescriptionsViaAI(supabase: any, items: BackfillItem[]): Promise<number> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey || items.length === 0) return 0;

  const productList = items.map((item, i) =>
    `${i + 1}. "${item.name}" by ${item.retailer}`
  ).join('\n');

  try {
    const resp = await fetch('https://agentic.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{
          role: 'user',
          content: `Write a brief 1-2 sentence product description for each fashion item below. Focus on what the garment looks like, its key features (fit, fabric type, design details), and what occasion it suits. Keep each under 200 characters. Return ONLY a JSON array of strings in order, no markdown.\n\n${productList}`
        }],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!resp.ok) {
      console.warn(`[backfill] AI API returned ${resp.status}`);
      return 0;
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[backfill] AI response not parseable as JSON array');
      return 0;
    }

    const descriptions: string[] = JSON.parse(jsonMatch[0]);
    let updated = 0;

    for (let i = 0; i < Math.min(descriptions.length, items.length); i++) {
      const desc = descriptions[i]?.trim();
      if (!desc || desc.length < 15) continue;
      const { error } = await supabase
        .from('product_catalog')
        .update({ description: desc.slice(0, 500) })
        .eq('id', items[i].id);
      if (!error) updated++;
    }

    console.log(`[backfill] AI generated ${updated}/${items.length} descriptions`);
    return updated;
  } catch (err) {
    console.error('[backfill] AI description error:', (err as Error).message);
    return 0;
  }
}

async function scrapeViaFirecrawl(supabase: any, items: BackfillItem[]): Promise<number> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.error('[backfill] FIRECRAWL_API_KEY missing');
    return 0;
  }
  let updated = 0;
  const CONCURRENCY = 12;

  async function processOne(item: BackfillItem) {
    if (!item.product_url) return;
    try {
      const resp = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: item.product_url,
          formats: ['summary'],
          onlyMainContent: true,
          waitFor: 800,
          timeout: 30000,
        }),
        signal: AbortSignal.timeout(35000),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success) {
        console.log(`[firecrawl] FAIL ${item.retailer} ${item.id}: ${data?.error || resp.status}`);
        return;
      }
      const summary = String(data.data?.summary || data.summary || '').trim().slice(0, 600);
      if (summary.length < 30) return;
      const { error } = await supabase.from('product_catalog').update({ description: summary }).eq('id', item.id);
      if (!error) updated++;
    } catch (e) {
      console.log(`[firecrawl] ERR ${item.id}: ${(e as Error).message}`);
    }
  }

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(items.slice(i, i + CONCURRENCY).map(processOne));
  }
  console.log(`[firecrawl] updated ${updated}/${items.length}`);
  return updated;
}

async function scrapeDescriptionsFromPages(supabase: any, items: BackfillItem[], skipAi = false): Promise<number> {
  let updated = 0;
  const unscrapeableItems: BackfillItem[] = [];

  for (const item of items) {
    if (!item.product_url) { unscrapeableItems.push(item); continue; }
    try {
      const resp = await fetch(item.product_url, {
        headers: { 'User-Agent': HTTP_UA },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) { unscrapeableItems.push(item); continue; }
      const html = await resp.text();

      const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']{20,500})["']/i)
        || html.match(/<meta\s+content=["']([^"']{20,500})["']\s+name=["']description["']/i);
      const ogMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']{20,500})["']/i)
        || html.match(/<meta\s+content=["']([^"']{20,500})["']\s+property=["']og:description["']/i);
      const ldMatch = html.match(/"description"\s*:\s*"([^"]{20,500})"/);

      const desc = metaMatch?.[1] || ogMatch?.[1] || ldMatch?.[1] || null;
      if (desc) {
        const clean = desc.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (clean.length > 15) {
          const { error: upErr } = await supabase
            .from('product_catalog')
            .update({ description: clean.slice(0, 500) })
            .eq('id', item.id);
          if (!upErr) { updated++; continue; }
        }
      }
      unscrapeableItems.push(item);
      await new Promise(r => setTimeout(r, 200));
    } catch {
      unscrapeableItems.push(item);
    }
  }

  // AI fallback for items that couldn't be scraped
  if (unscrapeableItems.length > 0 && !skipAi) {
    console.log(`[backfill] ${unscrapeableItems.length} items unscrapeable, using AI fallback`);
    const aiUpdated = await generateDescriptionsViaAI(supabase, unscrapeableItems.slice(0, 40));
    updated += aiUpdated;
  } else if (unscrapeableItems.length > 0) {
    console.log(`[backfill] ${unscrapeableItems.length} items unscrapeable, AI fallback skipped`);
  }

  return updated;
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
  const skipAi: boolean = body.skip_ai === true;
  const useFirecrawl: boolean = body.use_firecrawl === true;
  const background: boolean = body.background === true;

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

  const byRetailer: Record<string, BackfillItem[]> = {};
  for (const p of products) {
    const r = p.retailer;
    if (!byRetailer[r]) byRetailer[r] = [];
    byRetailer[r].push(p as BackfillItem);
  }

  const runWork = async () => {
    let totalUpdated = 0;
    const retailerResults: Record<string, number> = {};

    for (const [retailer, items] of Object.entries(byRetailer)) {
      const shopifyBase = SHOPIFY_DOMAINS[retailer];

      if (useFirecrawl && !shopifyBase) {
        const updated = await scrapeViaFirecrawl(supabase, items);
        retailerResults[retailer] = updated;
        totalUpdated += updated;
        continue;
      }

      if (shopifyBase) {
        try {
          const allShopifyProducts: any[] = [];
          for (let page = 1; page <= 10; page++) {
            const url = `${shopifyBase}/products.json?limit=250&page=${page}`;
            const resp = await fetch(url, { headers: { 'User-Agent': HTTP_UA }, signal: AbortSignal.timeout(10000) });
            if (!resp.ok) break;
            const json = await resp.json();
            if (!json.products || json.products.length === 0) break;
            allShopifyProducts.push(...json.products);
            if (json.products.length < 250) break;
            await new Promise(r => setTimeout(r, 500));
          }

          console.log(`[backfill] ${retailer}: fetched ${allShopifyProducts.length} Shopify products`);

          const descMap = new Map<string, string>();
          for (const sp of allShopifyProducts) {
            if (sp.body_html) {
              const desc = stripHtml(sp.body_html);
              if (desc) {
                if (sp.handle) descMap.set(sp.handle.toLowerCase(), desc);
                descMap.set(sp.title?.toLowerCase()?.trim(), desc);
              }
            }
          }

          let updated = 0;
          const unmatchedItems: BackfillItem[] = [];
          for (const item of items) {
            let desc: string | null = null;

            if (item.product_url) {
              try {
                const u = new URL(item.product_url);
                const segments = u.pathname.split('/').filter(Boolean);
                const handle = segments[segments.length - 1]?.toLowerCase();
                if (handle) desc = descMap.get(handle) || null;
              } catch {}
            }

            if (!desc) {
              desc = descMap.get(item.name?.toLowerCase()?.trim()) || null;
            }

            if (desc) {
              const { error: upErr } = await supabase
                .from('product_catalog')
                .update({ description: desc })
                .eq('id', item.id);
              if (!upErr) updated++;
            } else {
              unmatchedItems.push(item);
            }
          }

          if (unmatchedItems.length > 0) {
            console.log(`[backfill] ${retailer}: ${unmatchedItems.length} unmatched, falling back`);
            const fallbackUpdated = useFirecrawl
              ? await scrapeViaFirecrawl(supabase, unmatchedItems)
              : await scrapeDescriptionsFromPages(supabase, unmatchedItems, skipAi);
            updated += fallbackUpdated;
          }

          retailerResults[retailer] = updated;
          totalUpdated += updated;
        } catch (err) {
          console.error(`[backfill] ${retailer} error:`, (err as Error).message);
          if (useFirecrawl) {
            const fcUpdated = await scrapeViaFirecrawl(supabase, items);
            retailerResults[retailer] = fcUpdated;
            totalUpdated += fcUpdated;
          } else if (!skipAi) {
            const aiUpdated = await generateDescriptionsViaAI(supabase, items.slice(0, 40));
            retailerResults[retailer] = aiUpdated;
            totalUpdated += aiUpdated;
          } else {
            retailerResults[retailer] = 0;
          }
        }
      } else {
        const updated = await scrapeDescriptionsFromPages(supabase, items, skipAi);
        retailerResults[retailer] = updated;
        totalUpdated += updated;
      }
    }

    console.log(`[backfill] DONE total=${totalUpdated}`, retailerResults);
    return { totalUpdated, retailerResults };
  };

  if (background) {
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(runWork());
    return new Response(JSON.stringify({
      message: 'Backfill started in background',
      products_queued: products.length,
      retailers: Object.keys(byRetailer),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { totalUpdated, retailerResults } = await runWork();
  return new Response(JSON.stringify({
    message: `Backfilled ${totalUpdated} descriptions`,
    total_updated: totalUpdated,
    by_retailer: retailerResults,
    products_checked: products.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
