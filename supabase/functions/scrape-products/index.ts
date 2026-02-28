import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RawProduct {
  name: string;
  brand: string;
  product_url: string;
  price_cents: number | null;
  currency: string;
  image_urls: string[];
  category_raw: string | null;
  colour: string | null;
}

interface ClassifiedProduct extends RawProduct {
  image_url: string;
  presentation: 'ghost_mannequin' | 'flat_lay' | 'model_shot';
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAILER CATEGORY URLs
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, Record<string, string[]>> = {
  zara: {
    tops:       ['https://www.zara.com/us/en/man-tshirts-l855.html', 'https://www.zara.com/us/en/woman-tshirts-l1362.html'],
    bottoms:    ['https://www.zara.com/us/en/man-trousers-l838.html', 'https://www.zara.com/us/en/woman-trousers-l1335.html'],
    outerwear:  ['https://www.zara.com/us/en/man-jackets-l825.html', 'https://www.zara.com/us/en/woman-jackets-l1114.html'],
    dresses:    ['https://www.zara.com/us/en/woman-dresses-l1066.html'],
    shoes:      ['https://www.zara.com/us/en/man-shoes-l769.html', 'https://www.zara.com/us/en/woman-shoes-l1251.html'],
    accessories:['https://www.zara.com/us/en/man-accessories-l4734.html'],
  },
  hm: {
    tops:       ['https://www2.hm.com/en_us/men/products/t-shirts-and-tanks.html', 'https://www2.hm.com/en_us/women/products/tops.html'],
    bottoms:    ['https://www2.hm.com/en_us/men/products/pants.html', 'https://www2.hm.com/en_us/women/products/pants.html'],
    outerwear:  ['https://www2.hm.com/en_us/men/products/jackets-and-coats.html', 'https://www2.hm.com/en_us/women/products/jackets-and-coats.html'],
    dresses:    ['https://www2.hm.com/en_us/women/products/dresses.html'],
    shoes:      ['https://www2.hm.com/en_us/men/products/shoes.html', 'https://www2.hm.com/en_us/women/products/shoes.html'],
    accessories:['https://www2.hm.com/en_us/men/products/accessories.html'],
  },
  uniqlo: {
    tops:       ['https://www.uniqlo.com/us/en/men/tops/t-shirts', 'https://www.uniqlo.com/us/en/women/tops/t-shirts'],
    bottoms:    ['https://www.uniqlo.com/us/en/men/bottoms/pants', 'https://www.uniqlo.com/us/en/women/bottoms/pants'],
    outerwear:  ['https://www.uniqlo.com/us/en/men/outerwear', 'https://www.uniqlo.com/us/en/women/outerwear'],
    dresses:    ['https://www.uniqlo.com/us/en/women/dresses-and-jumpsuits'],
    shoes:      ['https://www.uniqlo.com/us/en/men/shoes-and-bags', 'https://www.uniqlo.com/us/en/women/shoes-and-bags'],
    accessories:['https://www.uniqlo.com/us/en/men/accessories-and-shoes'],
  },
  shein: {
    tops:       ['https://us.shein.com/Men-T-Shirts-c-12206.html', 'https://us.shein.com/Women-T-Shirts-c-1738.html'],
    bottoms:    ['https://us.shein.com/Men-Pants-c-12207.html', 'https://us.shein.com/Women-Pants-Leggings-c-1740.html'],
    outerwear:  ['https://us.shein.com/Men-Jackets-Coats-c-12201.html', 'https://us.shein.com/Women-Jackets-c-1735.html'],
    dresses:    ['https://us.shein.com/Women-Dresses-c-1727.html'],
    shoes:      ['https://us.shein.com/Men-Shoes-c-12211.html', 'https://us.shein.com/Women-Shoes-c-1745.html'],
    accessories:['https://us.shein.com/Men-Accessories-c-12214.html'],
  },
  nike: {
    tops:       ['https://www.nike.com/w/mens-tops-t-shirts-9om13zav4s6', 'https://www.nike.com/w/womens-tops-t-shirts-5e1x6z9om13'],
    bottoms:    ['https://www.nike.com/w/mens-pants-tights-2kq19z6o5re', 'https://www.nike.com/w/womens-pants-tights-2kq19z5e1x6'],
    outerwear:  ['https://www.nike.com/w/mens-jackets-vests-50r7yz6o5re', 'https://www.nike.com/w/womens-jackets-vests-50r7yz5e1x6'],
    shoes:      ['https://www.nike.com/w/mens-shoes-nik1zy7ok', 'https://www.nike.com/w/womens-shoes-5e1x6zy7ok'],
    accessories:['https://www.nike.com/w/mens-accessories-equipment-6o5rezawwv'],
  },
  asos: {
    tops:       ['https://www.asos.com/us/men/t-shirts-vests/cat/?cid=7616', 'https://www.asos.com/us/women/tops/cat/?cid=4169'],
    bottoms:    ['https://www.asos.com/us/men/pants-chinos/cat/?cid=4910', 'https://www.asos.com/us/women/pants-leggings/cat/?cid=7212'],
    outerwear:  ['https://www.asos.com/us/men/jackets-coats/cat/?cid=3606', 'https://www.asos.com/us/women/jackets-coats/cat/?cid=2641'],
    dresses:    ['https://www.asos.com/us/women/dresses/cat/?cid=8799'],
    shoes:      ['https://www.asos.com/us/men/shoes/cat/?cid=1935', 'https://www.asos.com/us/women/shoes/cat/?cid=1931'],
    accessories:['https://www.asos.com/us/men/accessories/cat/?cid=4210'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — Image classification prompt
// ─────────────────────────────────────────────────────────────────────────────

const STAGE3_SYSTEM = `You are an image URL classifier for DRIP FIT, a virtual try-on application. You receive a list of real image URLs for a single fashion product and must select the single best image for use as a try-on reference.

You cannot fetch or view the images. Classify them using:
1. URL path and filename patterns (most reliable signal)
2. Query parameters and CDN path segments
3. The product name and category provided as context
4. Known retailer CDN naming conventions

Return ONLY valid JSON. No prose. No markdown. No code fences.`;

const STAGE3_USER = (product: RawProduct) => `Select the best try-on image from the following product.

Product context:
  Name:     ${product.name}
  Brand:    ${product.brand}
  Category: ${product.category_raw ?? 'unknown'}

Image URLs to evaluate (all are real URLs for this product):
${product.image_urls.map((url, i) => `  ${i + 1}. ${url}`).join('\n')}

PREFER these URL patterns (rank in this order):

RANK 1 — Ghost mannequin / packshot:
  Filenames: -main, -front, -p00, -01, _1, _A, -hero
  Paths: /packshot/, /studio/, /product/, /catalog/
  Zara: URLs ending in '-p00.jpg' or '-p0.jpg'
  Uniqlo: URLs containing '/goods/' with '-sub1' absent
  H&M: filenames ending 'main.jpg'
  SHEIN: URLs containing 'whitem' or '_200w'

RANK 2 — Flat lay:
  Filenames: -flat, -lay, -top
  Paths: /flatlay/

RANK 3 — Model shot (only if no RANK 1/2):
  Filenames: -model, -worn, -look, -p01, _2, _B

REJECT: collage, runway, editorial, campaign, lifestyle, -detail, -close, -texture, -zoom, thumbnail, thumb, -xs, -sm, _swatch

Return exactly one JSON object:
{
  "selected_url":  string — the chosen image URL, copied exactly,
  "presentation":  "ghost_mannequin" | "flat_lay" | "model_shot",
  "confidence":    number — 0.0 to 1.0,
  "reject_reason": null | string — if ALL rejected, explain why
}`;

// ─────────────────────────────────────────────────────────────────────────────
// STAGES 1+2 — Firecrawl scrapes + extracts structured product data
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeProducts(
  brand: string,
  category: string,
  firecrawlApiKey: string
): Promise<RawProduct[]> {
  const brandUrls = CATEGORY_MAP[brand.toLowerCase()];
  if (!brandUrls) throw new Error(`No retailer config for brand: ${brand}. Available: ${Object.keys(CATEGORY_MAP).join(', ')}`);

  const urls = brandUrls[category.toLowerCase()];
  if (!urls?.length) throw new Error(`No URLs for ${brand}/${category}. Available categories: ${Object.keys(brandUrls).join(', ')}`);

  const allProducts: RawProduct[] = [];

  const jsonSchema = {
    type: 'object',
    properties: {
      products: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:         { type: 'string', description: 'Exact product name as shown on page' },
            product_url:  { type: 'string', description: 'Absolute URL to the product detail page' },
            price_cents:  { type: ['integer', 'null'], description: 'Price in cents (e.g. $89.99 = 8999)' },
            currency:     { type: 'string', description: '3-letter currency code' },
            image_urls:   { type: 'array', items: { type: 'string' }, description: 'All product image URLs found for this product' },
            category_raw: { type: ['string', 'null'], description: 'Category label from the page' },
            colour:       { type: ['string', 'null'], description: 'Colour from product name/label' },
          },
          required: ['name', 'product_url', 'image_urls'],
        },
      },
    },
    required: ['products'],
  };

  for (const url of urls) {
    try {
      console.log(`[scrape] Firecrawl JSON extract: ${url}`);

      const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['extract'],
          waitFor: 3000,
          extract: {
            schema: jsonSchema,
            prompt: `Extract all fashion products visible on this ${brand} category page. For each product, get the exact product name, product detail page URL, price in cents, all image URLs, category, and colour.`,
          },
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.warn(`[scrape] Firecrawl error for ${url}: ${JSON.stringify(data).slice(0, 300)}`);
        continue;
      }

      const extracted = data.data?.extract || data.extract || {};
      const products = extracted?.products || [];
      
      console.log(`[scrape] extracted ${products.length} products from ${url}`);

      for (const p of products) {
        if (!p.name || !p.product_url || !p.image_urls?.length) continue;
        allProducts.push({
          name: p.name,
          brand,
          product_url: p.product_url,
          price_cents: p.price_cents ?? null,
          currency: p.currency ?? 'USD',
          image_urls: p.image_urls,
          category_raw: p.category_raw ?? category,
          colour: p.colour ?? null,
        });
      }
    } catch (err) {
      console.warn(`[scrape] failed for ${url}:`, err);
    }

    await delay(1000);
  }

  return allProducts;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — Gemini classifies real image URLs, picks best for try-on
// ─────────────────────────────────────────────────────────────────────────────

async function classifyProductImages(
  product: RawProduct,
  apiKey: string
): Promise<ClassifiedProduct | null> {
  if (!product.image_urls?.length) return null;

  const resp = await callGemini(STAGE3_SYSTEM, STAGE3_USER(product), apiKey);

  try {
    const clean = resp.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const result = JSON.parse(jsonMatch[0]);

    if (!result.selected_url || result.confidence < 0.6) {
      console.warn(`[classify] rejected (confidence ${result.confidence}): ${product.name}`);
      return null;
    }

    // Verify the selected URL actually resolves
    try {
      const check = await fetch(result.selected_url, { method: 'HEAD' });
      if (!check.ok) {
        console.warn(`[classify] URL returned ${check.status}: ${result.selected_url}`);
        return null;
      }
    } catch {
      console.warn(`[classify] HEAD check failed: ${result.selected_url}`);
      return null;
    }

    return {
      ...product,
      image_url:    result.selected_url,
      presentation: result.presentation,
      confidence:   result.confidence,
    };
  } catch {
    console.error('[classify] JSON parse failed. Raw:', resp.slice(0, 300));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────

function deduplicateProducts(products: ClassifiedProduct[]): ClassifiedProduct[] {
  const seen = new Map<string, ClassifiedProduct>();

  for (const product of products) {
    const urlKey   = normaliseUrl(product.product_url);
    const imageKey = normaliseUrl(product.image_url);
    const nameKey  = nameFingerprint(product.name, product.brand);

    if (seen.has(urlKey)) {
      const existing = seen.get(urlKey)!;
      if (imagePriority(product.presentation) > imagePriority(existing.presentation)) {
        seen.set(urlKey, product);
      }
      continue;
    }
    if ([...seen.values()].some(p => normaliseUrl(p.image_url) === imageKey)) continue;

    const byName = [...seen.values()].find(p => nameFingerprint(p.name, p.brand) === nameKey);
    if (byName) {
      if (imagePriority(product.presentation) > imagePriority(byName.presentation)) {
        seen.delete(normaliseUrl(byName.product_url));
        seen.set(urlKey, product);
      }
      continue;
    }

    seen.set(urlKey, product);
  }

  return [...seen.values()];
}

async function filterExistingProducts(
  products: ClassifiedProduct[],
  supabase: ReturnType<typeof createClient>
): Promise<ClassifiedProduct[]> {
  if (!products.length) return [];

  const productUrls = products.map(p => normaliseUrl(p.product_url));
  const { data: existingByUrl } = await supabase
    .from('product_catalog')
    .select('product_url')
    .in('product_url', productUrls);

  const existingUrlSet = new Set((existingByUrl ?? []).map((r: any) => normaliseUrl(r.product_url)));
  let filtered = products.filter(p => !existingUrlSet.has(normaliseUrl(p.product_url)));

  const imageUrls = filtered.map(p => normaliseUrl(p.image_url));
  const { data: existingByImage } = await supabase
    .from('product_catalog')
    .select('image_url')
    .in('image_url', imageUrls);

  const existingImageSet = new Set((existingByImage ?? []).map((r: any) => normaliseUrl(r.image_url)));
  filtered = filtered.filter(p => !existingImageSet.has(normaliseUrl(p.image_url)));

  console.log(`[dedup] ${products.length} → ${filtered.length} new`);
  return filtered;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function callGemini(system: string, user: string, apiKey: string): Promise<string> {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      temperature: 0.0,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
    }),
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function normaliseUrl(url: string): string {
  try {
    const u = new URL(url);
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
     'sessionid','sid','token','ref','referer','source','clickid',
     'gclid','fbclid','msclkid','ttclid'].forEach(k => u.searchParams.delete(k));
    u.hostname = u.hostname.toLowerCase();
    u.searchParams.sort();
    return u.toString();
  } catch { return url.toLowerCase().trim(); }
}

function nameFingerprint(name: string, brand: string): string {
  return `${brand}|${name}`.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9| ]/g, '').trim();
}

function imagePriority(p: string | null): number {
  if (p === 'ghost_mannequin') return 3;
  if (p === 'flat_lay') return 2;
  if (p === 'model_shot') return 1;
  return 0;
}

function normaliseCategory(raw: string | null): string {
  if (!raw) return 'other';
  const r = raw.toLowerCase();
  if (/shirt|tee|top|blouse|hoodie|sweatshirt|cardigan|bodysuit|polo/.test(r)) return 'tops';
  if (/pant|jean|trouser|skirt|short|legging|jogger/.test(r)) return 'bottoms';
  if (/jacket|coat|blazer|bomber|puffer|trench|windbreaker|parka/.test(r)) return 'outerwear';
  if (/dress|jumpsuit|romper|gown/.test(r)) return 'dresses';
  if (/shoe|sneaker|boot|heel|sandal|loafer|mule|flat/.test(r)) return 'footwear';
  if (/bag|belt|hat|scarf|sunglass|jewel|watch|wallet|backpack/.test(r)) return 'accessories';
  return 'other';
}

function buildTags(p: ClassifiedProduct): string[] {
  const tags: string[] = [];
  if (p.brand) tags.push(p.brand.toLowerCase());
  if (p.colour) tags.push(p.colour.toLowerCase());
  if (p.category_raw) tags.push(p.category_raw.toLowerCase());
  if (p.presentation) tags.push(p.presentation);
  return [...new Set(tags)];
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, category } = await req.json();

    if (!brand || !category) {
      return new Response(JSON.stringify({ error: 'brand and category are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const runId = crypto.randomUUID();
    const results = { runId, brand, category, scraped: 0, extracted: 0, classified: 0, deduped: 0, inserted: 0 };
    console.log(`[run:${runId}] Starting: ${brand}/${category}`);

    // ── STAGES 1+2: Firecrawl scrape + JSON extract ──────────────────
    const rawProducts = await scrapeProducts(brand, category, FIRECRAWL_API_KEY);
    results.extracted = rawProducts.length;
    results.scraped = rawProducts.length > 0 ? 1 : 0;
    console.log(`[run:${runId}] Extracted ${rawProducts.length} products`);

    if (!rawProducts.length) {
      return new Response(JSON.stringify({ ...results, warning: 'No products extracted. Check Firecrawl output.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── STAGE 3: Classify images ─────────────────────────────────────
    const classified: ClassifiedProduct[] = [];
    for (const product of rawProducts) {
      const result = await classifyProductImages(product, OPENROUTER_API_KEY);
      if (result) classified.push(result);
      await delay(500);
    }
    results.classified = classified.length;
    console.log(`[run:${runId}] Classified ${classified.length} images`);

    // ── DEDUPLICATION ────────────────────────────────────────────────
    const withinRun = deduplicateProducts(classified);
    const newProducts = await filterExistingProducts(withinRun, supabase);
    results.deduped = newProducts.length;

    // ── DB INSERT ────────────────────────────────────────────────────
    if (newProducts.length > 0) {
      const rows = newProducts.map(p => ({
        name: p.name,
        brand: p.brand,
        retailer: p.brand,
        product_url: normaliseUrl(p.product_url),
        image_url: normaliseUrl(p.image_url),
        price_cents: p.price_cents,
        currency: p.currency ?? 'USD',
        category: normaliseCategory(p.category_raw),
        tags: buildTags(p),
        presentation: p.presentation,
        image_confidence: p.confidence,
        scrape_source: runId,
        scraped_at: new Date().toISOString(),
        is_active: true,
      }));

      const { error } = await supabase.from('product_catalog').insert(rows);

      if (error) {
        if (error.code === '23505') {
          console.warn(`[run:${runId}] Some skipped (unique constraint)`);
        } else {
          throw error;
        }
      }
      results.inserted = rows.length;
    }

    console.log(`[run:${runId}] Done. Inserted ${results.inserted}`);
    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Pipeline error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
