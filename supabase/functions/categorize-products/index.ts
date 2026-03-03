import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Valid product categories matching the app's category system
const VALID_CATEGORIES = [
  "t-shirts", "shirts", "hoodies", "polos", "sweaters", "tops",
  "jeans", "pants", "shorts", "skirts", "leggings", "bottoms",
  "dresses", "jumpsuits",
  "jackets", "coats", "blazers", "vests", "outerwear",
  "sneakers", "boots", "sandals", "loafers", "heels", "shoes",
  "bags", "hats", "jewelry", "sunglasses", "belts", "scarves",
  "activewear", "swimwear", "loungewear", "underwear",
] as const;

const CATEGORY_LIST = VALID_CATEGORIES.join(", ");

interface AnalysisResult {
  id: string;
  old_category: string;
  new_category: string;
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
    const category = body.category; // optional: only process specific category
    const onlyUnchecked = body.only_unchecked ?? true; // skip already-verified items

    // Fetch products to analyze
    let query = supabase
      .from("product_catalog")
      .select("id, name, brand, category, image_url, image_confidence, tags")
      .eq("is_active", true)
      .not("image_url", "is", null)
      .order("image_confidence", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (category) {
      query = query.eq("category", category);
    }

    // Use tags to track verified status — skip items already tagged 'ai_verified'
    if (onlyUnchecked) {
      query = query.not("tags", "cs", '{"ai_verified"}');
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
    let reclassified = 0;
    let deactivated = 0;

    // Process in mini-batches of 5 for parallelism
    for (let i = 0; i < products.length; i += 5) {
      const chunk = products.slice(i, i + 5);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (product) => {
          try {
            const result = await analyzeProduct(product, LOVABLE_API_KEY);
            return result;
          } catch (e) {
            console.error(`Error analyzing ${product.id}:`, e);
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

    // Apply updates
    for (const result of results) {
      const product = products.find((p) => p.id === result.id);
      if (!product) continue;

      const existingTags: string[] = Array.isArray(product.tags) ? product.tags : [];
      const newTags = [...new Set([...existingTags.filter(t => t !== "ai_verified" && t !== "ai_invalid"), "ai_verified"])];

      if (!result.is_valid_product) {
        // Deactivate non-product images (banners, logos, lifestyle shots without product)
        await supabase
          .from("product_catalog")
          .update({
            is_active: false,
            tags: [...newTags, "ai_invalid"],
            image_confidence: Math.min(result.confidence, 0.1),
          })
          .eq("id", result.id);
        deactivated++;
      } else if (result.new_category !== result.old_category) {
        // Reclassify
        await supabase
          .from("product_catalog")
          .update({
            category: result.new_category,
            tags: newTags,
            image_confidence: result.confidence,
          })
          .eq("id", result.id);
        reclassified++;
      } else {
        // Just mark as verified
        await supabase
          .from("product_catalog")
          .update({
            tags: newTags,
            image_confidence: Math.max(result.confidence, product.image_confidence ?? 0),
          })
          .eq("id", result.id);
      }
    }

    const summary = {
      processed: results.length,
      reclassified,
      deactivated,
      verified: results.length - reclassified - deactivated,
      details: results.map((r) => ({
        id: r.id,
        old: r.old_category,
        new: r.new_category,
        valid: r.is_valid_product,
        confidence: r.confidence,
        reason: r.reason,
      })),
    };

    console.log(`Done: ${results.length} processed, ${reclassified} reclassified, ${deactivated} deactivated`);

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

async function analyzeProduct(
  product: { id: string; name: string; brand: string; category: string; image_url: string },
  apiKey: string
): Promise<AnalysisResult> {
  const prompt = `You are a fashion product image classifier. Analyze this product image and determine:

1. Is this a real product photo (a single clothing item, shoe, bag, or accessory clearly visible)? 
   - Answer NO if it's a banner, logo, lifestyle/editorial photo without a clear product, a payment icon, a size chart, a model group shot, or any non-product image.
   
2. What specific category does this product belong to? Choose EXACTLY ONE from:
   ${CATEGORY_LIST}

The product is currently listed as:
- Name: "${product.name}"
- Brand: "${product.brand}"  
- Current category: "${product.category}"

Respond ONLY with valid JSON (no markdown):
{
  "is_valid_product": true/false,
  "category": "one of the valid categories",
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
  
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON in response: ${raw.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  // Validate category
  const validCategory = VALID_CATEGORIES.includes(parsed.category) 
    ? parsed.category 
    : product.category;

  return {
    id: product.id,
    old_category: product.category,
    new_category: validCategory,
    is_valid_product: Boolean(parsed.is_valid_product),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    reason: String(parsed.reason || ""),
  };
}
