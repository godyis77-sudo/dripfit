const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { successResponse, errorResponse } from "../_shared/validation.ts";

interface RetailerConfig {
  brand_name: string;
  url: string;
  categories: string[];
}

const RETAILERS: Record<string, RetailerConfig> = {
  zara: {
    brand_name: "Zara",
    url: "https://www.zara.com/us/en/help/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  hm: {
    brand_name: "H&M",
    url: "https://www2.hm.com/en_us/women/editorial/size-guide.html",
    categories: ["tops", "bottoms", "dresses", "activewear"],
  },
  uniqlo: {
    brand_name: "Uniqlo",
    url: "https://www.uniqlo.com/us/en/size-chart",
    categories: ["tops", "bottoms", "outerwear"],
  },
  shein: {
    brand_name: "SHEIN",
    url: "https://us.shein.com/Size-Guide-a-281.html",
    categories: ["tops", "bottoms", "dresses", "activewear"],
  },
  asos: {
    brand_name: "ASOS",
    url: "https://www.asos.com/size-charts/womens-clothing/",
    categories: ["tops", "bottoms", "dresses"],
  },
  nike: {
    brand_name: "Nike",
    url: "https://www.nike.com/size-fit/womens-apparel",
    categories: ["activewear", "footwear"],
  },
  gap: {
    brand_name: "Gap",
    url: "https://www.gap.com/browse/sizeChart.do",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  levis: {
    brand_name: "Levi's",
    url: "https://www.levi.com/US/en_US/size-charts/",
    categories: ["bottoms"],
  },
  adidas: {
    brand_name: "Adidas",
    url: "https://www.adidas.com/us/help/size_charts/women",
    categories: ["activewear", "footwear"],
  },
  zara_man: {
    brand_name: "Zara Man",
    url: "https://www.zara.com/us/en/help/size-guide",
    categories: ["tops", "bottoms", "outerwear"],
  },
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

const SYSTEM_PROMPT = `You are a fashion size chart data extraction specialist. Extract size chart measurement data from HTML into a structured JSON array. Rules: Extract ONLY data present in the HTML — never invent or estimate measurements. Convert all measurements to centimetres (multiply inches by 2.54). Use null for any measurement not found. Return ONLY a valid JSON array with no markdown, no code fences, no prose.`;

function buildUserPrompt(category: string, brandName: string, html: string): string {
  return `Extract the ${category} size chart from this HTML for ${brandName} (US sizing).
Return a JSON array where each element is one size:
[{ "label": string, "chest_min": number|null, "chest_max": number|null, "waist_min": number|null, "waist_max": number|null, "hips_min": number|null, "hips_max": number|null, "inseam_min": number|null, "inseam_max": number|null, "shoulder_min": number|null, "shoulder_max": number|null, "shoe_length_min": number|null, "shoe_length_max": number|null, "unit": "cm" }]
If no size chart found for this category in the HTML, return [].
HTML: ${html.slice(0, 50000)}`;
}

function stripFences(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return cleaned.trim();
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const filterSlug: string | undefined = body.brand_slug;
    const filterCategory: string | undefined = body.category;

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build work list
    const workList: { slug: string; config: RetailerConfig; category: string }[] = [];
    for (const [slug, config] of Object.entries(RETAILERS)) {
      if (filterSlug && slug !== filterSlug) continue;
      for (const cat of config.categories) {
        if (filterCategory && cat !== filterCategory) continue;
        workList.push({ slug, config, category: cat });
      }
    }

    let scraped = 0;
    let inserted = 0;
    let skipped = 0;
    const failed: string[] = [];

    // Cache fetched HTML per URL to avoid re-fetching for same brand with multiple categories
    const htmlCache: Record<string, string | null> = {};

    for (const item of workList) {
      scraped++;
      const key = `${item.slug}/${item.category}`;

      try {
        // Fetch HTML (with cache)
        let html = htmlCache[item.config.url];
        if (html === undefined) {
          try {
            const resp = await fetch(item.config.url, { headers: FETCH_HEADERS });
            if (!resp.ok) {
              console.error(`Fetch failed for ${item.config.url}: ${resp.status}`);
              htmlCache[item.config.url] = null;
            } else {
              htmlCache[item.config.url] = await resp.text();
            }
          } catch (fetchErr) {
            console.error(`Fetch error for ${item.config.url}:`, fetchErr);
            htmlCache[item.config.url] = null;
          }
          html = htmlCache[item.config.url];
        }

        if (!html) {
          failed.push(key);
          continue;
        }

        // Call Gemini via OpenRouter
        const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0.0,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: buildUserPrompt(item.category, item.config.brand_name, html) },
            ],
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`OpenRouter error for ${key}: ${aiResp.status} ${errText}`);
          failed.push(key);
          await delay(1500);
          continue;
        }

        const aiData = await aiResp.json();
        const rawContent = aiData.choices?.[0]?.message?.content || "";
        const cleaned = stripFences(rawContent);

        let parsed: any[];
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          console.error(`JSON parse failed for ${key}:`, cleaned.slice(0, 200));
          failed.push(key);
          await delay(1500);
          continue;
        }

        if (!Array.isArray(parsed) || parsed.length < 2) {
          console.log(`Skipped ${key}: only ${Array.isArray(parsed) ? parsed.length : 0} entries`);
          skipped++;
          await delay(1500);
          continue;
        }

        // Normalize size_data keys: hips -> hip for consistency with our schema
        const normalizedData = parsed.map((entry: any) => ({
          label: entry.label,
          chest_min: entry.chest_min ?? null,
          chest_max: entry.chest_max ?? null,
          waist_min: entry.waist_min ?? null,
          waist_max: entry.waist_max ?? null,
          hip_min: entry.hips_min ?? entry.hip_min ?? null,
          hip_max: entry.hips_max ?? entry.hip_max ?? null,
          inseam_min: entry.inseam_min ?? null,
          inseam_max: entry.inseam_max ?? null,
          shoulder_min: entry.shoulder_min ?? null,
          shoulder_max: entry.shoulder_max ?? null,
          shoe_length_min: entry.shoe_length_min ?? null,
          shoe_length_max: entry.shoe_length_max ?? null,
        }));

        // Upsert
        const { error: upsertErr } = await supabase.from("brand_size_charts").upsert(
          {
            brand_slug: item.slug,
            brand_name: item.config.brand_name,
            category: item.category,
            region: "US",
            size_data: normalizedData,
            scraped_at: new Date().toISOString(),
            is_active: true,
            size_system: "alpha",
            confidence: 0.8,
            source_url: item.config.url,
          },
          { onConflict: "brand_slug,category,region" }
        );

        if (upsertErr) {
          console.error(`Upsert error for ${key}:`, upsertErr);
          failed.push(key);
        } else {
          inserted++;
          console.log(`Inserted ${key}: ${normalizedData.length} sizes`);
        }
      } catch (err) {
        console.error(`Error processing ${key}:`, err);
        failed.push(key);
      }

      await delay(1500);
    }

    return new Response(
      JSON.stringify({ scraped, inserted, skipped, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scrape-size-charts error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
