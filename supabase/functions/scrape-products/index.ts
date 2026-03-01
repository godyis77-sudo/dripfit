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
    tops:       ['https://www2.hm.com/en_us/men/products/t-shirts-and-tanks.html?sort=stock&image-size=small&image=model&offset=0&page-size=36'],
    bottoms:    ['https://www2.hm.com/en_us/men/products/pants.html?sort=stock&image-size=small&image=model&offset=0&page-size=36'],
    outerwear:  ['https://www2.hm.com/en_us/men/products/jackets-and-coats.html?sort=stock&image-size=small&image=model&offset=0&page-size=36'],
    dresses:    ['https://www2.hm.com/en_us/women/products/dresses.html?sort=stock&image-size=small&image=model&offset=0&page-size=36'],
    shoes:      ['https://www2.hm.com/en_us/men/products/shoes.html?sort=stock&image-size=small&image=model&offset=0&page-size=36'],
    accessories:['https://www2.hm.com/en_us/men/products/accessories.html?sort=stock&image-size=small&image=model&offset=0&page-size=36'],
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

// (Stage 3 prompts removed — now uses deterministic URL scoring)
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
            category_raw: { type: ['string', 'null'], description: 'Category label from the page' },
            colour:       { type: ['string', 'null'], description: 'Colour from product name/label' },
          },
          required: ['name', 'product_url'],
        },
      },
    },
    required: ['products'],
  };

  for (const url of urls) {
    try {
      console.log(`[scrape] Firecrawl extract+links: ${url}`);

      const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['extract', 'rawHtml'],
          waitFor: brand.toLowerCase() === 'hm' ? 1000 : 3000,
          timeout: 30000,
          extract: {
            schema: jsonSchema,
            prompt: `Extract all fashion products visible on this ${brand} category page. For each product, get the exact product name, product detail page URL (absolute), price in cents, category, and colour.`,
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
      
      // Extract ALL image URLs from rawHtml
      const rawHtml = data.data?.rawHtml || data.rawHtml || '';
      const allImageUrls = extractImageUrlsFromHtml(rawHtml);
      
      console.log(`[scrape] extracted ${products.length} products, ${allImageUrls.length} image URLs from rawHtml of ${url}`);

      // Try ID-based matching first, then fall back to positional assignment
      const usedImages = new Set<string>();
      
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (!p.name || !p.product_url) continue;

        // 1. Try ID-based matching
        let productImages = matchImagesToProduct(p.product_url, p.name, allImageUrls, brand);
        
        // 2. If no ID match, try positional: assign ~N images per product
        if (!productImages.length && allImageUrls.length > 0) {
          const imagesPerProduct = Math.max(1, Math.floor(allImageUrls.length / Math.max(products.length, 1)));
          const start = i * imagesPerProduct;
          const end = Math.min(start + imagesPerProduct, allImageUrls.length);
          productImages = allImageUrls.slice(start, end).filter(img => !usedImages.has(img));
        }
        
        // Filter out already-used images
        productImages = productImages.filter(img => !usedImages.has(img));
        productImages.forEach(img => usedImages.add(img));

        if (productImages.length > 0) {
          allProducts.push({
            name: p.name,
            brand,
            product_url: p.product_url,
            price_cents: p.price_cents ?? null,
            currency: p.currency ?? 'USD',
            image_urls: productImages.slice(0, 8),
            category_raw: p.category_raw ?? category,
            colour: p.colour ?? null,
          });
        }
      }
    } catch (err) {
      console.warn(`[scrape] failed for ${url}:`, err);
    }

    await delay(1000);
  }

  return allProducts;
}

// Extract all image URLs from raw HTML
function extractImageUrlsFromHtml(rawHtml: string): string[] {
  const allImageUrls: string[] = [];
  const imgRegex = /(?:src|data-src|srcset|data-srcset|content)=["']([^"']*?(?:\.jpg|\.jpeg|\.png|\.webp|\.avif)[^"']*?)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(rawHtml)) !== null) {
    let imgUrl = match[1].split(/[,\s]/)[0]; // Take first URL from srcset
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    if (imgUrl.startsWith('http')) allImageUrls.push(imgUrl);
  }
  // Background images
  const bgRegex = /url\(["']?([^"')]*?(?:\.jpg|\.jpeg|\.png|\.webp|\.avif)[^"')]*?)["']?\)/gi;
  while ((match = bgRegex.exec(rawHtml)) !== null) {
    let imgUrl = match[1];
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    if (imgUrl.startsWith('http')) allImageUrls.push(imgUrl);
  }
  // Filter out tiny icons, sprites, logos
  const filtered = [...new Set(allImageUrls)].filter(url => {
    const lower = url.toLowerCase();
    return !/logo|icon|sprite|favicon|banner|promo|placeholder|pixel|tracking|analytics|1x1/i.test(lower);
  });
  return filtered;
}

// Match page image URLs to a specific product using URL slug patterns
function matchImagesToProduct(
  productUrl: string, 
  productName: string, 
  imageLinks: string[], 
  brand: string
): string[] {
  // Extract product ID / slug from product URL
  const slugs = extractProductIdentifiers(productUrl, brand);
  
  if (!slugs.length) {
    // Fallback: try name-based matching
    const nameTokens = productName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(t => t.length > 2);
    if (nameTokens.length === 0) return [];
    
    return imageLinks.filter(img => {
      const imgLower = img.toLowerCase();
      return nameTokens.filter(t => imgLower.includes(t)).length >= Math.min(2, nameTokens.length);
    }).slice(0, 8);
  }

  // Match images that contain any of the product identifiers
  const matched = imageLinks.filter(img => {
    const imgLower = img.toLowerCase();
    return slugs.some(slug => imgLower.includes(slug));
  });

  return matched.slice(0, 8);
}

function extractProductIdentifiers(productUrl: string, brand: string): string[] {
  const ids: string[] = [];
  const lower = productUrl.toLowerCase();
  const b = brand.toLowerCase();

  try {
    const u = new URL(productUrl);
    const path = u.pathname;

    if (b === 'zara') {
      // Zara: /us/en/product-name-pXXXXXXXX.html → pXXXXXXXX
      const m = path.match(/p(\d{7,})/);
      if (m) ids.push(`p${m[1]}`, m[1]);
    } else if (b === 'hm') {
      // H&M: /productpage.XXXXXXX.html or /en_us/productpage.XXXXXXX.html → XXXXXXX
      const m = path.match(/(\d{7,})/);
      if (m) ids.push(m[1]);
      // Also try shorter article codes (6 digits)
      const m2 = path.match(/(\d{6,})/);
      if (m2 && !ids.includes(m2[1])) ids.push(m2[1]);
    } else if (b === 'uniqlo') {
      // Uniqlo: /products/EXXXXXXX → EXXXXXXX or numeric ID
      const m = path.match(/(E?\d{6,})/i);
      if (m) ids.push(m[1].toLowerCase());
    } else if (b === 'shein') {
      // SHEIN: /product-pXXXXXXX-cat-XXXX.html
      const m = path.match(/p(\d{5,})/);
      if (m) ids.push(`p${m[1]}`, m[1]);
    } else if (b === 'nike') {
      // Nike: /t/product-name/XXXXXX-XXX
      const m = path.match(/([A-Z0-9]{6,}-[A-Z0-9]{3})/i);
      if (m) ids.push(m[1].toLowerCase());
    } else if (b === 'asos') {
      // ASOS: /product/XXXXXXX
      const m = path.match(/\/(\d{6,})/);
      if (m) ids.push(m[1]);
    }

    // Generic: last path segment slug
    if (!ids.length) {
      const segments = path.split('/').filter(Boolean);
      const last = segments[segments.length - 1]?.replace(/\.[^.]+$/, '');
      if (last && last.length > 3) ids.push(last.toLowerCase());
    }
  } catch { /* ignore */ }

  return ids;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — Deterministic image URL scoring (no LLM needed)
// ─────────────────────────────────────────────────────────────────────────────

function selectBestImage(product: RawProduct): ClassifiedProduct | null {
  if (!product.image_urls?.length) return null;

  let bestUrl = '';
  let bestScore = -1;
  let bestPresentation: 'ghost_mannequin' | 'flat_lay' | 'model_shot' = 'model_shot';

  for (const url of product.image_urls) {
    const lower = url.toLowerCase();
    let score = 0;
    let presentation: 'ghost_mannequin' | 'flat_lay' | 'model_shot' = 'model_shot';

    // REJECT patterns
    if (/-detail|-close|-texture|-zoom|thumb|_swatch|collage|runway|editorial|banner|logo|icon|sprite/i.test(lower)) {
      continue;
    }

    // RANK 1: Ghost mannequin / packshot signals
    if (/-main|_main|-front|_front|-p00|_p00|-hero|_hero|\/packshot|\/studio|\/catalog/i.test(lower)) {
      score += 10;
      presentation = 'ghost_mannequin';
    }
    // Zara-specific: -p00 or first image
    if (/static\.zara\.net/i.test(lower) && /-e\d+/i.test(lower)) {
      score += 5;
      presentation = 'ghost_mannequin';
    }
    // H&M: main.jpg
    if (/lp2\.hm\.com/i.test(lower) && /main/i.test(lower)) {
      score += 8;
      presentation = 'ghost_mannequin';
    }
    // Uniqlo: goods image, not sub
    if (/image\.uniqlo/i.test(lower) && !/-sub/i.test(lower)) {
      score += 6;
      presentation = 'ghost_mannequin';
    }

    // RANK 2: Flat lay signals
    if (/-flat|-lay|-top/i.test(lower)) {
      score += 7;
      presentation = 'flat_lay';
    }

    // RANK 3: Model shot (default)
    if (/-model|-worn|-look|-p01|_2\.|_b\./i.test(lower)) {
      score += 3;
      presentation = 'model_shot';
    }

    // Prefer larger images (query params like w=, width=)
    const widthMatch = lower.match(/[?&]w(?:idth)?=(\d+)/);
    if (widthMatch && parseInt(widthMatch[1]) >= 500) score += 2;

    // Prefer first image in sequence (_1, _01, -01)
    if (/[_-]0?1\b/i.test(lower)) score += 4;

    // Base score for being a valid image
    score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
      bestPresentation = presentation;
    }
  }

  if (!bestUrl) {
    // Just pick the first image as fallback
    bestUrl = product.image_urls[0];
    bestPresentation = 'model_shot';
    bestScore = 1;
  }

  return {
    ...product,
    image_url: bestUrl,
    presentation: bestPresentation,
    confidence: Math.min(bestScore / 15, 1.0),
  };
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
    const results = { runId, brand, category, scraped: 0, extracted: 0, classified: 0, deduped: 0, inserted: 0, withImages: 0 };
    console.log(`[run:${runId}] Starting: ${brand}/${category}`);

    // ── STAGES 1+2: Firecrawl scrape + rawHtml image extraction ──────
    const rawProducts = await scrapeProducts(brand, category, FIRECRAWL_API_KEY);
    results.extracted = rawProducts.length;
    results.scraped = rawProducts.length > 0 ? 1 : 0;
    results.withImages = rawProducts.filter(p => p.image_urls.length > 0).length;
    console.log(`[run:${runId}] Extracted ${rawProducts.length} products (${results.withImages} with images)`);

    if (!rawProducts.length) {
      return new Response(JSON.stringify({ ...results, warning: 'No products extracted.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── STAGE 3: Deterministic image scoring (no LLM) ────────────────
    const classified: ClassifiedProduct[] = [];
    for (const product of rawProducts) {
      const result = selectBestImage(product);
      if (result) classified.push(result);
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
