import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  "mr porter": "mens",
  "bonobos": "mens",
  "todd snyder": "mens",
  "mens wearhouse": "mens",
  "indochino": "mens",
};

const WOMENS_CATEGORIES = new Set([
  "dress", "dresses", "skirt", "skirts", "heels", "lingerie", "maternity",
  "bras", "bra", "bralettes", "bralette", "bikini", "bikinis", "swimsuit",
  "swimsuits", "tankini", "tankinis", "camisole", "camisoles", "romper", "rompers",
]);

const MENS_CATEGORIES = new Set([
  "boxers", "briefs", "cufflinks", "waistcoats", "tuxedos", "suits",
]);

const WOMENS_KEYWORDS = [
  " women ", " women s ", " womens ", " womenswear ", " woman ", " ladies ", " for her ", " female ", " girl ",
  " dress ", " skirt ", " bralette ", " lingerie ", " maternity ", " bodysuit ",
  " heel ", " stiletto ", " wedge ", " camisole ", " chemise ", " pumps ",
];

const MENS_KEYWORDS = [
  " men ", " men s ", " mens ", " menswear ", " male ", " for men ", " for him ", " guys ", " boy ",
  " boxer ", " brief ", " chino ", " dress shirt ", " sport coat ", " tuxedo ", " waistcoat ",
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

function classifyGender(name: string, brand: string, retailer: string, category: string): GenderLabel {
  const retailerKey = normalizeText(retailer).trim();
  if (RETAILER_GENDER[retailerKey]) return RETAILER_GENDER[retailerKey];

  const categoryKey = normalizeText(category).trim();
  if (WOMENS_CATEGORIES.has(categoryKey)) return "womens";
  if (MENS_CATEGORIES.has(categoryKey)) return "mens";

  const text = normalizeText(`${name} ${brand} ${retailer} ${category}`);
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
      .select("id, name, brand, retailer, category, gender")
      .eq("is_active", true)
      .eq("gender", "unisex")
      .order("id", { ascending: true })
      .limit(batchSize);

    if (cursor) {
      productsQuery = productsQuery.gt("id", cursor);
    }

    const { data: products, error } = await productsQuery;

    if (error) throw new Error(error.message);
    if (!products?.length) {
      return new Response(
        JSON.stringify({ message: "No more products", processed: 0, updated: 0, nextCursor: null, hasMore: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    for (const p of products) {
      const newGender = classifyGender(p.name, p.brand, p.retailer, p.category);
      if (newGender !== "unisex") {
        const { error: updateError } = await supabase
          .from("product_catalog")
          .update({ gender: newGender })
          .eq("id", p.id);

        if (updateError) throw new Error(updateError.message);
        updated++;
      }
    }

    const nextCursor = products[products.length - 1]?.id ?? null;
    const hasMore = products.length === batchSize;

    return new Response(
      JSON.stringify({ processed: products.length, updated, nextCursor, hasMore }),
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
