import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { successResponse, errorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type GenderLabel = "mens" | "womens" | "unisex";

// Retailer-level overrides
const RETAILER_GENDER: Record<string, Exclude<GenderLabel, "unisex">> = {
  "revolve": "womens",
  "net a porter": "womens",
  "victoria s secret": "womens",
  "fabletics": "womens",
  "torrid": "womens",
  "lane bryant": "womens",
  "prettylittlething": "womens",
  "fashion nova": "womens",
  "fashionnova": "womens",
  "glamorous": "womens",
  "missguided": "womens",
  "free people": "womens",
  "reformation": "womens",
  "anthropologie": "womens",
  "aritzia": "womens",
  "mr porter": "mens",
  "bonobos": "mens",
  "todd snyder": "mens",
  "mens wearhouse": "mens",
  "indochino": "mens",
};

// Brand-level overrides (some brands are exclusively one gender)
const BRAND_GENDER: Record<string, Exclude<GenderLabel, "unisex">> = {
  "glamorous": "womens",
  "missguided": "womens",
  "oh polly": "womens",
  "house of cb": "womens",
  "reformation": "womens",
  "faithfull the brand": "womens",
  "self portrait": "womens",
  "zimmermann": "womens",
  "for love and lemons": "womens",
  "free people": "womens",
  "aritzia": "womens",
  "skims": "womens",
  "good american": "womens",
};

const WOMENS_CATEGORIES = new Set([
  "dress", "dresses", "skirt", "skirts", "heels", "lingerie", "maternity",
  "bras", "bra", "bralettes", "bralette", "bikini", "bikinis", "swimsuit",
  "swimsuits", "tankini", "tankinis", "camisole", "camisoles", "romper", "rompers",
  "leggings", "jumpsuits", "jumpsuit",
]);

const MENS_CATEGORIES = new Set([
  "boxers", "briefs", "cufflinks", "waistcoats", "tuxedos", "suits",
]);

const WOMENS_KEYWORDS = [
  " women ", " women s ", " womens ", " womenswear ", " woman ", " ladies ", " for her ", " female ", " girl ",
  " dress ", " skirt ", " bralette ", " lingerie ", " maternity ", " bodysuit ",
  " heel ", " stiletto ", " wedge ", " camisole ", " chemise ", " pumps ",
  " sports bra ", " sport bra ", " sports bras ", " yoga pant ", " crop top ",
  " bikini ", " tankini ", " romper ", " legging ", " plus size sports ",
  " for women ", " seamless bra ",
  // New expanded keywords
  " midi dress ", " maxi dress ", " mini dress ", " wrap dress ", " slip dress ",
  " pencil skirt ", " mini skirt ", " pleated skirt ",
  " tote bag ", " clutch ", " crossbody ", " satchel ",
  " ballerina ", " ballet flat ", " mule ", " kitten heel ", " platform heel ",
  " blouse ", " peplum ", " babydoll ", " corset ", " bustier ",
  " jumpsuit ", " playsuit ", " culottes ",
  " high waist ", " high rise ", " high waisted ",
  " sarong ", " kaftan ", " caftan ",
  " shapewear ", " bodycon ", " off shoulder ", " off the shoulder ",
  " lounge cuddle ", " smocked ", " ruched ",
  " feminine ", " girly ",
];

const MENS_KEYWORDS = [
  " men ", " men s ", " mens ", " menswear ", " male ", " for men ", " for him ", " guys ", " boy ",
  " boxer ", " brief ", " chino ", " dress shirt ", " sport coat ", " tuxedo ", " waistcoat ",
  " men s underwear ", " compression short ", " athletic supporter ",
  // New expanded keywords
  " swim trunk ", " swim short ", " board short ",
  " oxford shirt ", " henley ", " muscle tee ", " muscle fit ",
  " flat front ", " cargo short ",
  " tie ", " necktie ", " bow tie ", " suspender ",
  " grooming ", " shaving ",
];

// URL path segments that indicate gender
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

// Keywords that indicate kids/junior products — should be deactivated entirely
const KIDS_KEYWORDS = [
  " junior ", " juniors ", " kids ", " kid s ", " children ", " child ",
  " boys ", " girls ", " toddler ", " infant ", " baby ", " teen ",
  " youth ", " jr ", " little ", " mini me ",
];

function normalizeText(value: string): string {
  return ` ${String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function scoreKeywords(text: string, keywords: string[]): number {
  let score = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) score++;
  }
  return score;
}

function isKidsProduct(text: string): boolean {
  return KIDS_KEYWORDS.some(kw => text.includes(kw));
}

function detectGenderFromUrl(productUrl: string | null): "mens" | "womens" | null {
  if (!productUrl) return null;
  const lower = productUrl.toLowerCase();
  const womensHits = URL_WOMENS_PATTERNS.filter(p => lower.includes(p)).length;
  const mensHits = URL_MENS_PATTERNS.filter(p => lower.includes(p)).length;
  if (womensHits > 0 && mensHits === 0) return "womens";
  if (mensHits > 0 && womensHits === 0) return "mens";
  return null;
}

function classifyGender(name: string, brand: string, retailer: string, category: string, productUrl?: string | null): GenderLabel | "kids" {
  const text = normalizeText(`${name} ${brand} ${retailer} ${category}`);

  // Kids check first
  if (isKidsProduct(text)) return "kids";

  // Retailer-level override
  const retailerKey = normalizeText(retailer).trim();
  if (RETAILER_GENDER[retailerKey]) return RETAILER_GENDER[retailerKey];

  // Brand-level override
  const brandKey = normalizeText(brand).trim();
  if (BRAND_GENDER[brandKey]) return BRAND_GENDER[brandKey];

  // Category-level override
  const categoryKey = normalizeText(category).trim();
  if (WOMENS_CATEGORIES.has(categoryKey)) return "womens";
  if (MENS_CATEGORIES.has(categoryKey)) return "mens";

  // URL-based detection — retailer breadcrumbs are very reliable
  const urlGender = detectGenderFromUrl(productUrl ?? null);
  if (urlGender) {
    // If URL clearly says one gender, trust it unless name strongly contradicts
    const womensScore = scoreKeywords(text, WOMENS_KEYWORDS);
    const mensScore = scoreKeywords(text, MENS_KEYWORDS);
    if (urlGender === "womens" && mensScore <= womensScore) return "womens";
    if (urlGender === "mens" && womensScore <= mensScore) return "mens";
    // If scores contradict URL, still prefer URL (retailers know their taxonomy)
    return urlGender;
  }

  // Keyword scoring
  const womensScore = scoreKeywords(text, WOMENS_KEYWORDS);
  const mensScore = scoreKeywords(text, MENS_KEYWORDS);

  if (womensScore > mensScore && womensScore >= 1) return "womens";
  if (mensScore > womensScore && mensScore >= 1) return "mens";
  return "unisex";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(Number(body.batch_size ?? 300), 50), 1000);
    const cursor = typeof body.cursor === "string" ? body.cursor : null;

    let productsQuery = supabase
      .from("product_catalog")
      .select("id, name, brand, retailer, category, gender, tags, product_url")
      .eq("is_active", true)
      .eq("gender", "unisex")
      .order("id", { ascending: true })
      .limit(batchSize);

    if (cursor) {
      productsQuery = productsQuery.gt("id", cursor);
    }

    const { data: products, error } = await productsQuery;

    if (error) return errorResponse(error.message, "DB_ERROR", 500, corsHeaders);
    if (!products?.length) {
      return successResponse({ message: "No more products", processed: 0, updated: 0, deactivated: 0, nextCursor: null, hasMore: false }, 200, corsHeaders);
    }

    let updated = 0;
    let deactivated = 0;
    for (const p of products) {
      const result = classifyGender(p.name, p.brand, p.retailer, p.category, p.product_url);
      
      if (result === "kids") {
        // Deactivate kids products
        const existingTags: string[] = Array.isArray(p.tags) ? p.tags : [];
        await supabase
          .from("product_catalog")
          .update({ 
            is_active: false, 
            tags: [...new Set([...existingTags, "kids_product", "ai_failed"])] 
          })
          .eq("id", p.id);
        deactivated++;
      } else if (result !== "unisex") {
        const { error: updateError } = await supabase
          .from("product_catalog")
          .update({ gender: result })
          .eq("id", p.id);
        if (updateError) throw new Error(updateError.message);
        updated++;
      }
    }

    const nextCursor = products[products.length - 1]?.id ?? null;
    const hasMore = products.length === batchSize;

    return new Response(
      JSON.stringify({ processed: products.length, updated, deactivated, nextCursor, hasMore }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("backfill-gender error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
