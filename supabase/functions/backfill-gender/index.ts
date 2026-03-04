import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Retailer-level overrides
const RETAILER_GENDER: Record<string, string> = {
  "revolve": "womens",
  "mr porter": "mens",
  "net-a-porter": "womens",
  "victoria's secret": "womens",
  "fabletics": "womens",
  "torrid": "womens",
  "lane bryant": "womens",
  "bonobos": "mens",
  "todd snyder": "mens",
  "mens wearhouse": "mens",
  "indochino": "mens",
};

const WOMENS_KEYWORDS = [
  "women", "woman", "for her", "ladies", "feminine", "girls",
  "dress", "skirt", "bralette", "legging",
  "romper", "blouse", "tunic", "bodysuit", "bikini", "tankini",
  "maternity",
  "heel", "stiletto", "wedge", "midi dress", "maxi dress",
  "crop top", "camisole", "chemise",
];

const MENS_KEYWORDS = [
  "for men", "men's", "mens", " male",
  "boxer", "brief",
  "chinos", "cargo pant", "trucker",
  "henley", "oxford shirt", "flannel shirt",
  "suit jacket", "sport coat", "dress shirt",
  "masculine", "guys",
];

function classifyGender(name: string, brand: string, retailer: string): string {
  const retailerLower = retailer.toLowerCase().trim();
  if (RETAILER_GENDER[retailerLower]) return RETAILER_GENDER[retailerLower];

  const text = `${name} ${brand} ${retailer}`.toLowerCase();

  let womensScore = 0;
  let mensScore = 0;

  for (const kw of WOMENS_KEYWORDS) {
    if (text.includes(kw)) womensScore++;
  }
  for (const kw of MENS_KEYWORDS) {
    if (text.includes(kw)) mensScore++;
  }

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
    const batchSize = body.batch_size ?? 200;
    const offset = body.offset ?? 0;

    const { data: products, error } = await supabase
      .from("product_catalog")
      .select("id, name, brand, retailer, gender")
      .eq("is_active", true)
      .range(offset, offset + batchSize - 1);

    if (error) throw new Error(error.message);
    if (!products?.length) {
      return new Response(
        JSON.stringify({ message: "No more products", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    for (const p of products) {
      const newGender = classifyGender(p.name, p.brand, p.retailer);
      if (newGender !== (p.gender ?? "unisex")) {
        await supabase
          .from("product_catalog")
          .update({ gender: newGender })
          .eq("id", p.id);
        updated++;
      }
    }

    return new Response(
      JSON.stringify({ processed: products.length, updated, nextOffset: offset + batchSize }),
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
