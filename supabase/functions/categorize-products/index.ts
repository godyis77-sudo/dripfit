import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

function isJunkImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return JUNK_IMAGE_PATTERNS.some(p => lower.includes(p));
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

    // Fetch products — use array containment operator properly
    let query = supabase
      .from("product_catalog")
      .select("id, name, brand, retailer, category, image_url, image_confidence, tags, gender")
      .eq("is_active", true)
      .not("image_url", "is", null)
      .order("image_confidence", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (category) {
      query = query.eq("category", category);
    }

    // Use array containment to check tags — fixed from SIMILAR TO
    if (onlyUnchecked) {
      query = query.not("tags", "cs", '{"ai_verified"}').not("tags", "cs", '{"ai_failed"}');
    }

    const { data: products, error: fetchError } = await query;
    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: "No products to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${products.length} products...`);

    const results: AnalysisResult[] = [];
    const failedIds: { id: string; tags: string[] }[] = [];

    // Pre-filter: deactivate products with junk image URLs before wasting AI calls
    const junkProducts = products.filter(p => isJunkImageUrl(p.image_url));
    const validProducts = products.filter(p => !isJunkImageUrl(p.image_url));

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
          // Accept if status OK — some CDNs don't return content-type on HEAD
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

    console.log(`${reachableProducts.length} reachable, ${junkProducts.length} junk, ${validProducts.length - reachableProducts.length} unreachable`);

    // Process reachable products in mini-batches of 5 for parallelism
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
            // Tag immediately so poison products don't block future batches
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

    // Apply updates — batch by update type to reduce round-trips
    let reclassified = 0;
    let deactivated = 0;

    for (const result of results) {
      const product = products.find((p) => p.id === result.id);
      if (!product) continue;

      const existingTags: string[] = Array.isArray(product.tags) ? product.tags : [];
      const baseTags = existingTags.filter(t => t !== "ai_verified" && t !== "ai_invalid" && t !== "ai_failed");
      const newTags = [...new Set([...baseTags, "ai_verified"])];

      // Normalize retailer name if needed
      const normalizedRetailer = normalizeRetailer(product.retailer);
      const retailerUpdate = normalizedRetailer !== product.retailer
        ? { retailer: normalizedRetailer } : {};

      if (!result.is_valid_product) {
        await supabase
          .from("product_catalog")
          .update({
            is_active: false,
            tags: [...newTags, "ai_invalid"],
            image_confidence: Math.min(result.confidence, 0.1),
            gender: result.gender,
            ...retailerUpdate,
          })
          .eq("id", result.id);
        deactivated++;
      } else {
        const updatePayload: Record<string, unknown> = {
          tags: newTags,
          image_confidence: Math.max(result.confidence, product.image_confidence ?? 0),
          gender: result.gender,
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

    console.log(`Done: ${results.length} processed, ${reclassified} reclassified, ${deactivated} deactivated, ${failedIds.length} failed`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("categorize-products error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
   - Answer NO if it's a banner, logo, lifestyle/editorial photo without a clear product, a payment icon, a size chart, a model group shot, or any non-product image.
   
2. What specific category does this product belong to? Choose EXACTLY ONE from:
   ${CATEGORY_LIST}

3. What gender is this product designed for? Choose EXACTLY ONE from: mens, womens, unisex
   - Use contextual clues: silhouette, styling, model, brand positioning
   - Default to "unisex" if ambiguous

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
  
  const validCategory = VALID_CATEGORIES.includes(parsed.category)
    ? parsed.category
    : product.category;

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
