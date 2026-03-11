import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { successResponse, errorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_CATEGORIES = [
  "t-shirts", "shirts", "hoodies", "polos", "sweaters", "tops",
  "jeans", "pants", "shorts", "skirts", "leggings", "bottoms",
  "dresses", "jumpsuits",
  "jackets", "coats", "blazers", "vests", "outerwear",
  "sneakers", "boots", "sandals", "loafers", "heels", "shoes",
  "bags", "hats", "jewelry", "sunglasses", "belts", "scarves",
  "activewear", "swimwear", "loungewear", "underwear",
] as const;

const VALID_GENDERS = ["mens", "womens", "unisex"] as const;
const CATEGORY_LIST = VALID_CATEGORIES.join(", ");

// Categories that are ALWAYS a specific gender — override AI if it disagrees
const ALWAYS_WOMENS_CATEGORIES = new Set([
  "dresses", "skirts", "heels", "jumpsuits", "leggings",
  "lingerie", "bralettes", "bikinis", "tankinis",
]);
const ALWAYS_MENS_CATEGORIES = new Set<string>([
  // currently none that are absolute, but reserved
]);

// Keywords in product name that force a gender regardless of AI output
const FORCE_WOMENS_NAME_PATTERNS = [
  "sports bra", "sport bra", "bralette", "bikini", "yoga pant",
  "crop top", "tankini", "romper", "lingerie", "maternity",
  "camisole", "seamless bra", "women's", "womens ", "for women",
  "for her", "midi dress", "maxi dress", "mini dress", "wrap dress",
  "slip dress", "pencil skirt", "mini skirt", "pleated skirt",
  "bodycon", "babydoll", "corset", "bustier", "peplum",
  "ballerina", "ballet flat", "kitten heel", "platform heel",
  "shapewear", "off shoulder", "smocked", "ruched",
  "sarong", "kaftan", "caftan", "culottes", "playsuit",
  "rash guard", "plus size swim", "swimsuit",
  "tote bag", "clutch bag", "crossbody bag", "satchel bag",
];
const FORCE_MENS_NAME_PATTERNS = [
  "boxer", "men's underwear", "compression short", "athletic supporter",
  "men's ", "mens ", "for men", "for him",
  "swim trunk", "swim short", "board short",
  "oxford shirt", "henley ", "muscle tee", "muscle fit",
  "flat front", "cargo short", "necktie", "bow tie", "suspender",
];

// Hostnames / URL patterns that are tracking pixels, CAPTCHAs, or non-product images
const JUNK_IMAGE_PATTERNS = [
  "fls-na.amazon.com",
  "doubleclick.net",
  "/risk/challenge",
  "/page-designer/",
  "/uedata",
  "/captcha",
  "/batch/1/",
  "/pixel",
  "/tracking",
  "static.zara.net",
  "googleads.",
  "googlesyndication.",
  "facebook.com/tr",
  "bat.bing.com",
];

// URL path segments that indicate gender — used to parse retailer breadcrumbs
const URL_WOMENS_PATTERNS = [
  "/women/", "/womens/", "/woman/", "/women-", "/womens-",
  "/woman-", "women+clothing", "women+apparel", "women-clothing",
  "women-apparel", "/ladies/", "/ladies-", "/female/",
  "shopping/women", "/womenswear/", "cat/women",
];
const URL_MENS_PATTERNS = [
  "/men/", "/mens/", "/man/", "/men-", "/mens-", "/man-",
  "men+clothing", "men+apparel", "men-clothing", "men-apparel",
  "/male/", "shopping/men", "/menswear/", "cat/men",
];

/**
 * Extract gender signal from product URL path/breadcrumb structure.
 * Returns 'mens', 'womens', or null if no clear signal.
 */
function detectGenderFromUrl(productUrl: string | null): "mens" | "womens" | null {
  if (!productUrl) return null;
  const lower = productUrl.toLowerCase();
  const womensHits = URL_WOMENS_PATTERNS.filter(p => lower.includes(p)).length;
  const mensHits = URL_MENS_PATTERNS.filter(p => lower.includes(p)).length;
  // Only use URL signal if it's unambiguous
  if (womensHits > 0 && mensHits === 0) return "womens";
  if (mensHits > 0 && womensHits === 0) return "mens";
  return null;
}

// Keywords indicating kids/junior products — deactivate entirely
const KIDS_PATTERNS = [
  "junior", "juniors", " kids ", "kid's", "children", "child ",
  " boys ", " girls ", "toddler", "infant", "baby ", "teen boy",
  "teen girl", " youth ", " jr ", "2-6 years", "little kids",
  "mini me", "boys'", "girls'",
];

// Product names that indicate category/listing pages, not actual products
const CATEGORY_PAGE_PATTERNS = [
  "accessories for", "wallets for", "watches for",
  " | shop ", " | farfetch", "shop now on",
  "quick shipping to", " - shop ", "page 2 |",
  "shop farfetch", " | zara canada", " | zara mexico",
  " | zara united states", "for women |", "for men |",
  "sale & clearance", "designer ", " selection",
  "everything you need to know", "shop now",
  "women's designer", "men's designer",
  " | nordstrom", " | net-a-porter", " | ssense",
  " | asos", " | uniqlo", " | mango",
];

function isJunkImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return JUNK_IMAGE_PATTERNS.some(p => lower.includes(p));
}

function isKidsProduct(name: string): boolean {
  const lower = name.toLowerCase();
  return KIDS_PATTERNS.some(p => lower.includes(p));
}

function isCategoryPage(name: string): boolean {
  const lower = name.toLowerCase();
  return CATEGORY_PAGE_PATTERNS.some(p => lower.includes(p));
}

// Map DB retailer names for matching (lowercase -> proper)
const RETAILER_NORMALIZE: Record<string, string> = {
  "h&m": "H&M",
  "hm": "H&M",
  "shein": "SHEIN",
  "asos": "ASOS",
  "prettylittlething": "PrettyLittleThing",
  "a bathing ape": "A Bathing Ape",
  "stüssy": "Stüssy",
  "stussy": "Stüssy",
  "abercrombie & fitch": "Abercrombie & Fitch",
  "abercrombie": "Abercrombie & Fitch",
  "j.crew": "J.Crew",
  "jcrew": "J.Crew",
};

interface AnalysisResult {
  id: string;
  old_category: string;
  new_category: string;
  gender: string;
  is_valid_product: boolean;
  confidence: number;
  reason: string;
}

/**
 * Apply deterministic gender override based on category, product name, and URL.
 * This runs AFTER AI classification to catch misgendered items.
 */
function enforceGender(
  name: string,
  category: string,
  aiGender: string,
  productUrl?: string | null
): string {
  // Category-level overrides (highest priority)
  if (ALWAYS_WOMENS_CATEGORIES.has(category)) return "womens";
  if (ALWAYS_MENS_CATEGORIES.has(category)) return "mens";

  const lower = name.toLowerCase();

  // URL-based gender detection — retailer breadcrumbs are very reliable
  const urlGender = detectGenderFromUrl(productUrl ?? null);
  if (urlGender) {
    // URL says womens but AI said mens — trust URL (retailers know their own taxonomy)
    // Unless name explicitly has strong men's keywords
    if (urlGender === "womens" && aiGender !== "womens") {
      if (!FORCE_MENS_NAME_PATTERNS.some(p => lower.includes(p))) {
        return "womens";
      }
    }
    if (urlGender === "mens" && aiGender !== "mens") {
      if (!FORCE_WOMENS_NAME_PATTERNS.some(p => lower.includes(p))) {
        return "mens";
      }
    }
  }

  // Name-level overrides — women's patterns
  if (FORCE_WOMENS_NAME_PATTERNS.some(p => lower.includes(p))) {
    if (aiGender === "mens" && FORCE_MENS_NAME_PATTERNS.some(p => lower.includes(p))) {
      return aiGender; // ambiguous, trust AI
    }
    return "womens";
  }

  // Name-level overrides — men's patterns
  if (FORCE_MENS_NAME_PATTERNS.some(p => lower.includes(p))) {
    if (!FORCE_WOMENS_NAME_PATTERNS.some(p => lower.includes(p))) {
      return "mens";
    }
  }

  return aiGender;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const batchSize = body.batch_size ?? 20;
    const category = body.category;
    const onlyUnchecked = body.only_unchecked ?? true;

    // Fetch products
    let query = supabase
      .from("product_catalog")
      .select("id, name, brand, retailer, category, image_url, image_confidence, tags, gender, product_url")
      .eq("is_active", true)
      .not("image_url", "is", null)
      .order("image_confidence", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (category) {
      query = query.eq("category", category);
    }

    if (onlyUnchecked) {
      query = query.not("tags", "cs", '{"ai_verified"}').not("tags", "cs", '{"ai_failed"}');
    }

    const { data: products, error: fetchError } = await query;
    if (fetchError) return errorResponse(`Fetch error: ${fetchError.message}`, "DB_ERROR", 500, corsHeaders);
    if (!products || products.length === 0) {
      return successResponse({ message: "No products to process", processed: 0 }, 200, corsHeaders);
    }

    console.log(`Processing ${products.length} products...`);

    const results: AnalysisResult[] = [];
    const failedIds: { id: string; tags: string[] }[] = [];

    // Pre-filter 0: Deactivate kids products
    const kidsProducts = products.filter(p => isKidsProduct(p.name));
    const adultProducts = products.filter(p => !isKidsProduct(p.name));

    if (kidsProducts.length > 0) {
      console.log(`Deactivating ${kidsProducts.length} kids/junior products`);
      for (const kp of kidsProducts) {
        const existingTags: string[] = Array.isArray(kp.tags) ? kp.tags : [];
        await supabase
          .from("product_catalog")
          .update({
            is_active: false,
            tags: [...new Set([...existingTags, "kids_product", "ai_failed"])],
            image_confidence: 0,
          })
          .eq("id", kp.id);
      }
    }

    // Pre-filter 1: Deactivate category pages before wasting AI calls
    const categoryPages = adultProducts.filter(p => isCategoryPage(p.name));
    const nonPageProducts = adultProducts.filter(p => !isCategoryPage(p.name));

    if (categoryPages.length > 0) {
      console.log(`Deactivating ${categoryPages.length} category/listing pages`);
      for (const cp of categoryPages) {
        const existingTags: string[] = Array.isArray(cp.tags) ? cp.tags : [];
        await supabase
          .from("product_catalog")
          .update({
            is_active: false,
            tags: [...new Set([...existingTags, "category_page", "ai_failed"])],
            image_confidence: 0,
          })
          .eq("id", cp.id);
      }
    }

    // Pre-filter 2: Deactivate products with junk image URLs
    const junkProducts = nonPageProducts.filter(p => isJunkImageUrl(p.image_url));
    const validProducts = nonPageProducts.filter(p => !isJunkImageUrl(p.image_url));

    if (junkProducts.length > 0) {
      console.log(`Deactivating ${junkProducts.length} products with junk image URLs`);
      for (const jp of junkProducts) {
        const existingTags: string[] = Array.isArray(jp.tags) ? jp.tags : [];
        await supabase
          .from("product_catalog")
          .update({
            is_active: false,
            tags: [...new Set([...existingTags, "junk_image", "ai_failed"])],
            image_confidence: 0,
          })
          .eq("id", jp.id);
      }
    }

    // Pre-validate: HEAD-check image URLs to skip unreachable ones
    const reachableProducts: typeof validProducts = [];
    const headChecks = await Promise.allSettled(
      validProducts.map(async (product) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const resp = await fetch(product.image_url, {
            method: "HEAD",
            redirect: "follow",
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const ct = resp.headers.get("content-type") || "";
          if (resp.ok && (ct.startsWith("image/") || ct === "")) {
            return { product, reachable: true };
          }
          return { product, reachable: false };
        } catch {
          return { product, reachable: false };
        }
      })
    );

    for (const result of headChecks) {
      if (result.status === "fulfilled") {
        if (result.value.reachable) {
          reachableProducts.push(result.value.product);
        } else {
          const p = result.value.product;
          const existingTags: string[] = Array.isArray(p.tags) ? p.tags : [];
          failedIds.push({ id: p.id, tags: [...new Set([...existingTags, "ai_failed", "unreachable_image"])] });
          console.warn(`Unreachable image for ${p.id}: ${p.image_url.slice(0, 80)}`);
        }
      }
    }

    console.log(`${reachableProducts.length} reachable, ${junkProducts.length} junk, ${categoryPages.length} cat-pages, ${validProducts.length - reachableProducts.length} unreachable`);

    // Process reachable products in mini-batches of 5
    for (let i = 0; i < reachableProducts.length; i += 5) {
      const chunk = reachableProducts.slice(i, i + 5);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (product) => {
          try {
            return await analyzeProduct(product, LOVABLE_API_KEY);
          } catch (e) {
            console.error(`Error analyzing ${product.id}:`, e);
            const existingTags: string[] = Array.isArray(product.tags) ? product.tags : [];
            const failTags = [...new Set([...existingTags, "ai_failed"])];
            await supabase.from("product_catalog").update({ tags: failTags }).eq("id", product.id);
            failedIds.push({ id: product.id, tags: failTags });
            return null;
          }
        })
      );

      for (const settled of chunkResults) {
        if (settled.status === "fulfilled" && settled.value) {
          results.push(settled.value);
        }
      }
    }

    // Batch update failed items
    for (const item of failedIds) {
      await supabase.from("product_catalog").update({ tags: item.tags }).eq("id", item.id);
    }

    // Apply updates
    let reclassified = 0;
    let deactivated = 0;
    let genderFixed = 0;

    for (const result of results) {
      const product = products.find((p) => p.id === result.id);
      if (!product) continue;

      const existingTags: string[] = Array.isArray(product.tags) ? product.tags : [];
      const baseTags = existingTags.filter(t => t !== "ai_verified" && t !== "ai_invalid" && t !== "ai_failed");
      const newTags = [...new Set([...baseTags, "ai_verified"])];

      const normalizedRetailer = normalizeRetailer(product.retailer);
      const retailerUpdate = normalizedRetailer !== product.retailer
        ? { retailer: normalizedRetailer } : {};

      // Apply deterministic gender enforcement AFTER AI classification
      const enforcedGender = enforceGender(product.name, result.new_category, result.gender, product.product_url);
      if (enforcedGender !== result.gender) {
        genderFixed++;
        console.log(`Gender override: ${product.name.slice(0, 50)} | AI=${result.gender} -> ${enforcedGender}`);
      }

      if (!result.is_valid_product) {
        await supabase
          .from("product_catalog")
          .update({
            is_active: false,
            tags: [...newTags, "ai_invalid"],
            image_confidence: Math.min(result.confidence, 0.1),
            gender: enforcedGender,
            ...retailerUpdate,
          })
          .eq("id", result.id);
        deactivated++;
      } else {
        const updatePayload: Record<string, unknown> = {
          tags: newTags,
          image_confidence: Math.max(result.confidence, product.image_confidence ?? 0),
          gender: enforcedGender,
          ...retailerUpdate,
        };

        if (result.new_category !== result.old_category) {
          updatePayload.category = result.new_category;
          reclassified++;
        }

        await supabase
          .from("product_catalog")
          .update(updatePayload)
          .eq("id", result.id);
      }
    }

    const summary = {
      processed: results.length,
      failed: failedIds.length,
      reclassified,
      deactivated,
      genderFixed,
      categoryPagesRemoved: categoryPages.length,
      verified: results.length - reclassified - deactivated,
      details: results.map((r) => ({
        id: r.id,
        old: r.old_category,
        new: r.new_category,
        gender: r.gender,
        valid: r.is_valid_product,
        confidence: r.confidence,
        reason: r.reason,
      })),
    };

    console.log(`Done: ${results.length} processed, ${reclassified} reclassified, ${deactivated} deactivated, ${genderFixed} gender-fixed, ${categoryPages.length} cat-pages, ${failedIds.length} failed`);

    return successResponse(summary, 200, corsHeaders);
  } catch (e) {
    console.error("categorize-products error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});

function normalizeRetailer(name: string): string {
  const lower = name.toLowerCase().trim();
  return RETAILER_NORMALIZE[lower] ?? name;
}

async function analyzeProduct(
  product: { id: string; name: string; brand: string; retailer: string; category: string; image_url: string },
  apiKey: string
): Promise<AnalysisResult> {
  const prompt = `You are a fashion product image classifier. Analyze this product image and determine:

1. Is this a real product photo (a single clothing item, shoe, bag, or accessory clearly visible)? 
   - Answer NO if it's a banner, logo, lifestyle/editorial photo without a clear product, a payment icon, a size chart, a model group shot, a category listing page, or any non-product image.
   - Answer NO if the product name looks like a category page (e.g. "Men's Polo Shirts - ASOS", "Accessories for Women")
   
2. What specific category does this product belong to? Choose EXACTLY ONE from:
   ${CATEGORY_LIST}
   - IMPORTANT: Do NOT use "footwear" or "other". Map to the most specific category.
   - Sneakers, running shoes, trainers → "sneakers"
   - Dress shoes, oxfords → "shoes"  
   - Wallets, belt bags, fanny packs → "bags"
   - Sunglasses, eyewear → "sunglasses"

3. What gender is this product designed for? Choose EXACTLY ONE from: mens, womens, unisex
   - Use contextual clues: silhouette, styling, model, brand positioning
   - Sports bras, bralettes, bikinis, leggings, yoga pants, crop tops are ALWAYS "womens" — never "unisex"
   - Boxers, briefs, compression shorts, men's underwear are ALWAYS "mens" — never "unisex"
   - Dresses, skirts, heels, jumpsuits, rompers are ALWAYS "womens"
   - Only use "unisex" for truly gender-neutral items (basic tees, sneakers, outerwear without gendered styling)

The product is currently listed as:
- Name: "${product.name}"
- Brand: "${product.brand}"
- Retailer: "${product.retailer}"
- Current category: "${product.category}"

Respond ONLY with valid JSON (no markdown):
{
  "is_valid_product": true/false,
  "category": "one of the valid categories",
  "gender": "mens/womens/unisex",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: product.image_url } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI gateway ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON in response: ${raw.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  // Remap invalid categories to closest valid one
  let validCategory = VALID_CATEGORIES.includes(parsed.category)
    ? parsed.category
    : remapCategory(parsed.category, product.name);

  const validGender = VALID_GENDERS.includes(parsed.gender)
    ? parsed.gender
    : "unisex";

  return {
    id: product.id,
    old_category: product.category,
    new_category: validCategory,
    gender: validGender,
    is_valid_product: Boolean(parsed.is_valid_product),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    reason: String(parsed.reason || ""),
  };
}

/**
 * Remap non-standard categories returned by AI to valid ones.
 */
function remapCategory(aiCategory: string, productName: string): string {
  const cat = (aiCategory || "").toLowerCase();
  const name = productName.toLowerCase();

  if (cat === "footwear") {
    if (name.includes("sneaker") || name.includes("running")) return "sneakers";
    if (name.includes("boot")) return "boots";
    if (name.includes("loafer")) return "loafers";
    if (name.includes("sandal")) return "sandals";
    if (name.includes("heel")) return "heels";
    return "shoes";
  }
  if (cat === "wallet" || cat === "wallets" || cat === "belt bag" || cat === "fanny pack" || cat === "clutch" || cat === "tote" || cat === "backpack" || cat === "crossbody" || cat === "satchel") return "bags";
  if (cat === "eyewear" || cat === "glasses") return "sunglasses";
  if (cat === "sweatshirt" || cat === "sweatshirts" || cat === "hoodie") return "hoodies";
  if (cat === "trousers" || cat === "chinos" || cat === "joggers" || cat === "sweatpants") return "pants";
  if (cat === "tee" || cat === "tees" || cat === "t-shirt") return "t-shirts";
  if (cat === "pullover" || cat === "cardigan" || cat === "knitwear" || cat === "knit") return "sweaters";
  if (cat === "romper" || cat === "rompers" || cat === "playsuit") return "jumpsuits";
  if (cat === "parka" || cat === "puffer" || cat === "overcoat" || cat === "trench") return "coats";
  if (cat === "cap" || cat === "caps" || cat === "beanie" || cat === "bucket hat") return "hats";
  if (cat === "wrap" || cat === "shawl" || cat === "stole") return "scarves";
  if (cat === "gilet" || cat === "waistcoat") return "vests";
  if (cat === "tank" || cat === "tank top" || cat === "camisole" || cat === "blouse") return "tops";
  if (cat === "culottes" || cat === "palazzo") return "pants";
  if (cat === "mule" || cat === "mules" || cat === "flat" || cat === "flats" || cat === "oxford" || cat === "oxfords" || cat === "derby") return "shoes";
  if (cat === "slide" || cat === "slides" || cat === "flip flop" || cat === "flip flops") return "sandals";
  if (cat === "trainer" || cat === "trainers" || cat === "running shoe" || cat === "running shoes") return "sneakers";
  if (cat === "bomber" || cat === "windbreaker" || cat === "anorak") return "jackets";
  if (cat === "bodysuit") return "tops";
  if (cat === "swim trunks" || cat === "board shorts") return "swimwear";

  // Fallback: use name-based heuristics
  if (name.includes("sneaker") || name.includes("trainer")) return "sneakers";
  if (name.includes("jacket") || name.includes("puffer")) return "jackets";
  if (name.includes("pant") || name.includes("trouser")) return "pants";
  if (name.includes("dress")) return "dresses";
  if (name.includes("shirt")) return "shirts";

  // Final fallback
  return "other";
}
