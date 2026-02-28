import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RetailerConfig {
  categoryUrl: (cat: string) => string;
}

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
// CONSTANTS — AI PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const STAGE2_SYSTEM = `You are a product data extraction specialist for a fashion e-commerce database. You receive raw HTML from a retailer category page and extract structured product data from it.

Rules:
- Extract ONLY products that are explicitly present in the HTML.
- Do NOT invent, infer, or add any product that is not in the HTML.
- Do NOT normalise, clean, or rewrite product names — extract verbatim.
- Do NOT generate or modify any URLs — copy them exactly as they appear in the HTML, including all query parameters.
- If a field is not present in the HTML, use null. Never guess.
- Return ONLY a valid JSON array. No markdown. No prose. No code fences.`;

const STAGE2_USER = (html: string) => `Extract all products from the following HTML.

For each product found, return:
{
  "name":         string  — exact product name as shown on page,
  "product_url":  string  — absolute URL to the product detail page,
  "price_cents":  integer — price in cents (e.g. $89.99 → 8999), null if not found,
  "currency":     string  — 3-letter currency code e.g. "USD",
  "image_urls":   string[] — ALL image URLs found for this product in the HTML, ordered as they appear. Include every variant/angle. Copy URLs exactly.
  "category_raw": string  — the category as labelled on the page,
  "colour":       string  — colour as shown in product name or label, null if not explicit.
}

HTML to extract from:
\`\`\`
${html.slice(0, 80_000)}
\`\`\`

Return ONLY a JSON array. If no products are found, return []. Do not explain. Do not add commentary.`;

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

RANK 1 — Ghost mannequin / packshot signals:
  Filenames containing: -main, -front, -p00, -01, _1, _A, -hero
  Path segments: /packshot/, /studio/, /product/, /catalog/
  Zara-specific: URLs ending in '-p00.jpg' or '-p0.jpg'
  Uniqlo-specific: URLs containing '/goods/' with '-sub1' absent
  H&M-specific: filenames ending in 'main.jpg'
  SHEIN-specific: URLs containing 'whitem' or '_200w'

RANK 2 — Flat lay signals:
  Filenames containing: -flat, -lay, -top
  Path segments: /flatlay/

RANK 3 — Model shot, clean background:
  Filenames containing: -model, -worn, -look, -p01, _2, _B
  Use ONLY if no RANK 1 or RANK 2 images are available.

REJECT these URL patterns (do not select):
  - collage, runway, editorial, campaign, look, outfit, lifestyle
  - -detail, -close, -texture, -fabric, -zoom, -care, -label
  - interior, _swatch, -colour, color-chip
  - thumbnail, thumb, -xs, -sm, -tiny

Return exactly one JSON object:
{
  "selected_url":  string — the chosen image URL, copied exactly,
  "presentation":  "ghost_mannequin" | "flat_lay" | "model_shot",
  "confidence":    number — 0.0 to 1.0,
  "reject_reason": null | string — if ALL images rejected, explain why. selected_url = null.
}`;

// ─────────────────────────────────────────────────────────────────────────────
// RETAILER CONFIGS
// ─────────────────────────────────────────────────────────────────────────────

const RETAILER_CONFIGS: Record<string, RetailerConfig> = {
  'zara': {
    categoryUrl: (cat) => `https://www.zara.com/us/en/${cat}-l1098.html`,
  },
  'hm': {
    categoryUrl: (cat) => `https://www2.hm.com/en_us/productlisting/${cat}.html`,
  },
  'uniqlo': {
    categoryUrl: (cat) => `https://www.uniqlo.com/us/en/${cat}?page={page}`,
  },
  'shein': {
    categoryUrl: (cat) => `https://us.shein.com/${cat}.html`,
  },
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — Fetch real HTML from retailer category pages
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCategoryHTML(
  brand: string,
  category: string,
  pageCount: number
): Promise<string[]> {
  const config = RETAILER_CONFIGS[brand.toLowerCase()];
  if (!config) throw new Error(`No retailer config found for brand: ${brand}`);

  const pages: string[] = [];

  for (let page = 0; page < pageCount; page++) {
    const url = config.categoryUrl(category)
      .replace('{offset}', String(page * 40))
      .replace('{page}', String(page + 1));

    try {
      const resp = await fetch(url, { headers: BROWSER_HEADERS });

      if (!resp.ok) {
        console.warn(`[stage1] ${brand} page ${page + 1} returned HTTP ${resp.status} — skipping`);
        continue;
      }

      const html = await resp.text();
      pages.push(html);
      console.log(`[stage1] fetched ${brand}/${category} page ${page + 1} (${html.length} chars)`);
    } catch (err) {
      console.warn(`[stage1] fetch failed for ${brand} page ${page + 1}:`, err);
    }

    // Polite delay — prevent rate limiting
    await delay(800 + Math.random() * 400);
  }

  return pages;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 — Gemini extracts structured data from real HTML
// ─────────────────────────────────────────────────────────────────────────────

async function extractProductsFromHTML(
  html: string,
  brand: string,
  apiKey: string
): Promise<RawProduct[]> {
  const resp = await callGemini(
    STAGE2_SYSTEM,
    STAGE2_USER(html),
    apiKey
  );

  try {
    const clean = resp.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    const jsonMatch = clean.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const products = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(products)) return [];
    return products.map((p: any) => ({ ...p, brand }));
  } catch {
    console.error('[stage2] JSON parse failed. Raw response (first 300 chars):', resp.slice(0, 300));
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — Gemini classifies real image URLs, picks best for try-on
// ─────────────────────────────────────────────────────────────────────────────

async function classifyProductImages(
  product: RawProduct,
  apiKey: string
): Promise<ClassifiedProduct | null> {
  if (!product.image_urls?.length) return null;

  const resp = await callGemini(
    STAGE3_SYSTEM,
    STAGE3_USER(product),
    apiKey
  );

  try {
    const clean = resp.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const result = JSON.parse(jsonMatch[0]);

    if (!result.selected_url || result.confidence < 0.6) {
      console.warn(`[stage3] rejected (low confidence ${result.confidence}): ${product.name}`);
      return null;
    }

    // Verify the selected URL actually resolves — no hallucinated URLs enter the DB
    try {
      const check = await fetch(result.selected_url, { method: 'HEAD' });
      if (!check.ok) {
        console.warn(`[stage3] selected URL returned ${check.status}: ${result.selected_url}`);
        return null;
      }
    } catch {
      console.warn(`[stage3] HEAD check failed for: ${result.selected_url}`);
      return null;
    }

    return {
      ...product,
      image_url:    result.selected_url,
      presentation: result.presentation,
      confidence:   result.confidence,
    };
  } catch {
    console.error('[stage3] JSON parse failed. Raw response:', resp.slice(0, 300));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION — within-run and cross-run
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

    const byName = [...seen.values()].find(
      p => nameFingerprint(p.name, p.brand) === nameKey
    );
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

  const existingUrlSet = new Set(
    (existingByUrl ?? []).map((r: any) => normaliseUrl(r.product_url))
  );
  let filtered = products.filter(p => !existingUrlSet.has(normaliseUrl(p.product_url)));

  const imageUrls = filtered.map(p => normaliseUrl(p.image_url));
  const { data: existingByImage } = await supabase
    .from('product_catalog')
    .select('image_url')
    .in('image_url', imageUrls);

  const existingImageSet = new Set(
    (existingByImage ?? []).map((r: any) => normaliseUrl(r.image_url))
  );
  filtered = filtered.filter(p => !existingImageSet.has(normaliseUrl(p.image_url)));

  console.log(`[dedup] ${products.length} classified → ${filtered.length} new (not in DB)`);
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
    const DROP = [
      'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
      'sessionid','sid','token','ref','referer','source','clickid',
      'gclid','fbclid','msclkid','ttclid',
    ];
    DROP.forEach(k => u.searchParams.delete(k));
    u.hostname = u.hostname.toLowerCase();
    u.searchParams.sort();
    return u.toString();
  } catch {
    return url.toLowerCase().trim();
  }
}

function nameFingerprint(name: string, brand: string): string {
  return `${brand}|${name}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9| ]/g, '')
    .trim();
}

function imagePriority(presentation: string | null): number {
  if (presentation === 'ghost_mannequin') return 3;
  if (presentation === 'flat_lay')        return 2;
  if (presentation === 'model_shot')      return 1;
  return 0;
}

function normaliseCategory(raw: string | null): string {
  if (!raw) return 'other';
  const r = raw.toLowerCase();
  if (/shirt|tee|top|blouse|hoodie|sweatshirt|cardigan|bodysuit|polo/.test(r)) return 'tops';
  if (/pant|jean|trouser|skirt|short|legging|jogger/.test(r))                  return 'bottoms';
  if (/jacket|coat|blazer|bomber|puffer|trench|windbreaker|parka/.test(r))     return 'outerwear';
  if (/dress|jumpsuit|romper|gown/.test(r))                                     return 'dresses';
  if (/shoe|sneaker|boot|heel|sandal|loafer|mule|flat/.test(r))                return 'footwear';
  if (/bag|belt|hat|scarf|sunglass|jewel|watch|wallet|backpack/.test(r))       return 'accessories';
  return 'other';
}

function buildTags(p: ClassifiedProduct): string[] {
  const tags: string[] = [];
  if (p.brand)        tags.push(p.brand.toLowerCase());
  if (p.colour)       tags.push(p.colour.toLowerCase());
  if (p.category_raw) tags.push(p.category_raw.toLowerCase());
  if (p.presentation) tags.push(p.presentation);
  return [...new Set(tags)];
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, category, pageCount = 2 } = await req.json();

    if (!brand || !category) {
      return new Response(JSON.stringify({ error: 'brand and category are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const runId = crypto.randomUUID();
    const results = { runId, brand, category, scraped: 0, extracted: 0, classified: 0, deduped: 0, inserted: 0 };

    console.log(`[run:${runId}] Starting pipeline: ${brand}/${category}`);

    // ── STAGE 1: Fetch real HTML ─────────────────────────────────────
    const htmlPages = await fetchCategoryHTML(brand, category, pageCount);
    results.scraped = htmlPages.length;

    if (!htmlPages.length) {
      return new Response(JSON.stringify({ ...results, warning: 'No HTML pages fetched. Check retailer config.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── STAGE 2: Extract products from HTML ──────────────────────────
    const rawProducts: RawProduct[] = [];
    for (const html of htmlPages) {
      const extracted = await extractProductsFromHTML(html, brand, OPENROUTER_API_KEY);
      rawProducts.push(...extracted);
      await delay(1500);
    }
    results.extracted = rawProducts.length;
    console.log(`[run:${runId}] Stage 2 complete: ${rawProducts.length} products extracted`);

    // ── STAGE 3: Classify images ─────────────────────────────────────
    const classified: ClassifiedProduct[] = [];
    for (const product of rawProducts) {
      if (!product.image_urls?.length) continue;
      const result = await classifyProductImages(product, OPENROUTER_API_KEY);
      if (result) classified.push(result);
      await delay(500);
    }
    results.classified = classified.length;
    console.log(`[run:${runId}] Stage 3 complete: ${classified.length} images classified`);

    // ── DEDUPLICATION ────────────────────────────────────────────────
    const withinRun   = deduplicateProducts(classified);
    const newProducts = await filterExistingProducts(withinRun, supabase);
    results.deduped   = newProducts.length;

    // ── DB INSERT ────────────────────────────────────────────────────
    if (newProducts.length > 0) {
      const rows = newProducts.map(p => ({
        name:             p.name,
        brand:            p.brand,
        retailer:         p.brand,
        product_url:      normaliseUrl(p.product_url),
        image_url:        normaliseUrl(p.image_url),
        price_cents:      p.price_cents,
        currency:         p.currency ?? 'USD',
        category:         normaliseCategory(p.category_raw),
        tags:             buildTags(p),
        presentation:     p.presentation,
        image_confidence: p.confidence,
        scrape_source:    runId,
        scraped_at:       new Date().toISOString(),
        is_active:        true,
      }));

      const { error } = await supabase
        .from('product_catalog')
        .insert(rows);

      if (error) {
        if (error.code === '23505') {
          console.warn(`[run:${runId}] Some products skipped (unique constraint) — expected`);
        } else {
          throw error;
        }
      }

      results.inserted = rows.length;
    }

    console.log(`[run:${runId}] Done. Inserted ${results.inserted} new products.`);
    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Pipeline fatal error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
