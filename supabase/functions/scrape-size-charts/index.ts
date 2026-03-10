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
  // ── Fast Fashion & Mass Market ──
  zara: {
    brand_name: "Zara",
    url: "https://www.zara.com/us/en/help/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  hm: {
    brand_name: "H&M",
    url: "https://www2.hm.com/en_us/women/editorial/size-guide.html",
    categories: ["tops", "bottoms", "dresses", "outerwear", "activewear"],
  },
  uniqlo: {
    brand_name: "Uniqlo",
    url: "https://www.uniqlo.com/us/en/size-chart",
    categories: ["tops", "bottoms", "outerwear"],
  },
  shein: {
    brand_name: "SHEIN",
    url: "https://us.shein.com/Size-Guide-a-281.html",
    categories: ["tops", "bottoms", "dresses", "outerwear", "activewear"],
  },
  "forever-21": {
    brand_name: "Forever 21",
    url: "https://www.forever21.com/us/size-guide",
    categories: ["tops", "bottoms", "dresses"],
  },
  boohoo: {
    brand_name: "Boohoo",
    url: "https://us.boohoo.com/page/size-guide.html",
    categories: ["tops", "bottoms", "dresses"],
  },
  prettylittlething: {
    brand_name: "PrettyLittleThing",
    url: "https://www.prettylittlething.us/size-guide",
    categories: ["tops", "bottoms", "dresses"],
  },
  "fashion-nova": {
    brand_name: "Fashion Nova",
    url: "https://www.fashionnova.com/pages/size-chart",
    categories: ["tops", "bottoms", "dresses"],
  },
  mango: {
    brand_name: "Mango",
    url: "https://shop.mango.com/us/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  cos: {
    brand_name: "COS",
    url: "https://www.cos.com/en_usd/customer-service/size-guide.html",
    categories: ["tops", "bottoms", "dresses"],
  },

  // ── Mid-Range / Mall Brands ──
  gap: {
    brand_name: "Gap",
    url: "https://www.gap.com/browse/sizeChart.do",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  "old-navy": {
    brand_name: "Old Navy",
    url: "https://oldnavy.gap.com/browse/sizeChart.do",
    categories: ["tops", "bottoms", "dresses"],
  },
  "banana-republic": {
    brand_name: "Banana Republic",
    url: "https://bananarepublic.gap.com/browse/sizeChart.do",
    categories: ["tops", "bottoms", "dresses"],
  },
  abercrombie: {
    brand_name: "Abercrombie & Fitch",
    url: "https://www.abercrombie.com/shop/us/size-charts",
    categories: ["tops", "bottoms", "dresses"],
  },
  hollister: {
    brand_name: "Hollister",
    url: "https://www.hollisterco.com/shop/us/size-charts",
    categories: ["tops", "bottoms", "dresses"],
  },
  "american-eagle": {
    brand_name: "American Eagle",
    url: "https://www.ae.com/us/en/content/help/men-size-chart",
    categories: ["tops", "bottoms"],
  },
  jcrew: {
    brand_name: "J.Crew",
    url: "https://www.jcrew.com/r/size-charts",
    categories: ["tops", "bottoms", "dresses"],
  },
  "calvin-klein": {
    brand_name: "Calvin Klein",
    url: "https://www.calvinklein.us/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  "ralph-lauren": {
    brand_name: "Ralph Lauren",
    url: "https://www.ralphlauren.com/size-charts",
    categories: ["tops", "bottoms", "outerwear"],
  },
  "hugo-boss": {
    brand_name: "Hugo Boss",
    url: "https://www.hugoboss.com/us/size-guide/",
    categories: ["tops", "bottoms", "outerwear"],
  },
  everlane: {
    brand_name: "Everlane",
    url: "https://www.everlane.com/size-guide",
    categories: ["tops", "bottoms"],
  },
  anthropologie: {
    brand_name: "Anthropologie",
    url: "https://www.anthropologie.com/help/size-charts",
    categories: ["tops", "dresses"],
  },
  "free-people": {
    brand_name: "Free People",
    url: "https://www.freepeople.com/size-chart/",
    categories: ["tops", "dresses"],
  },
  reformation: {
    brand_name: "Reformation",
    url: "https://www.thereformation.com/pages/size-chart",
    categories: ["tops", "bottoms", "dresses"],
  },
  aritzia: {
    brand_name: "Aritzia",
    url: "https://www.aritzia.com/en/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  nordstrom: {
    brand_name: "Nordstrom",
    url: "https://www.nordstrom.com/browse/content/size-charts",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  jcpenney: {
    brand_name: "JCPenney",
    url: "https://www.jcpenney.com/m/size-charts",
    categories: ["tops", "bottoms", "dresses"],
  },

  // ── Denim ──
  levis: {
    brand_name: "Levi's",
    url: "https://www.levi.com/US/en_US/size-charts/",
    categories: ["tops", "bottoms"],
  },

  // ── Sportswear / Activewear ──
  nike: {
    brand_name: "Nike",
    url: "https://www.nike.com/size-fit/womens-apparel",
    categories: ["tops", "bottoms", "activewear", "footwear", "outerwear"],
  },
  adidas: {
    brand_name: "Adidas",
    url: "https://www.adidas.com/us/help/size_charts",
    categories: ["tops", "bottoms", "activewear", "footwear", "outerwear"],
  },
  puma: {
    brand_name: "Puma",
    url: "https://us.puma.com/us/en/size-guide",
    categories: ["tops", "activewear", "footwear", "outerwear"],
  },
  "new-balance": {
    brand_name: "New Balance",
    url: "https://www.newbalance.com/size-chart",
    categories: ["tops", "bottoms", "activewear", "footwear", "outerwear"],
  },
  champion: {
    brand_name: "Champion",
    url: "https://www.champion.com/size-chart",
    categories: ["tops", "bottoms", "activewear", "outerwear"],
  },
  lululemon: {
    brand_name: "Lululemon",
    url: "https://shop.lululemon.com/help/size-guide",
    categories: ["tops", "bottoms", "activewear"],
  },
  "the-north-face": {
    brand_name: "The North Face",
    url: "https://www.thenorthface.com/help/size-chart.html",
    categories: ["tops", "outerwear", "activewear"],
  },
  patagonia: {
    brand_name: "Patagonia",
    url: "https://www.patagonia.com/size-fit-guide.html",
    categories: ["tops", "outerwear"],
  },
  arcteryx: {
    brand_name: "Arc'teryx",
    url: "https://arcteryx.com/us/en/help/size-chart",
    categories: ["tops", "bottoms", "outerwear"],
  },
  "under-armour": {
    brand_name: "Under Armour",
    url: "https://www.underarmour.com/en-us/size-charts",
    categories: ["tops", "bottoms", "activewear", "footwear"],
  },

  // ── Streetwear ──
  stussy: {
    brand_name: "Stüssy",
    url: "https://www.stussy.com/pages/size-guide",
    categories: ["tops", "bottoms", "outerwear"],
  },
  supreme: {
    brand_name: "Supreme",
    url: "https://www.supremenewyork.com/shop/sizing",
    categories: ["tops", "bottoms", "outerwear"],
  },
  kith: {
    brand_name: "Kith",
    url: "https://kith.com/pages/size-guide",
    categories: ["tops", "bottoms", "outerwear"],
  },
  "carhartt-wip": {
    brand_name: "Carhartt WIP",
    url: "https://www.carhartt-wip.com/en/size-guide",
    categories: ["tops", "bottoms", "outerwear"],
  },
  "fear-of-god": {
    brand_name: "Fear of God",
    url: "https://fearofgod.com/pages/size-guide",
    categories: ["tops", "bottoms", "outerwear"],
  },
  "off-white": {
    brand_name: "Off-White",
    url: "https://www.off---white.com/en-us/size-guide",
    categories: ["tops", "outerwear"],
  },

  // ── Luxury / Designer ──
  gucci: {
    brand_name: "Gucci",
    url: "https://www.gucci.com/us/en/st/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  "louis-vuitton": {
    brand_name: "Louis Vuitton",
    url: "https://us.louisvuitton.com/eng-us/stories/size-guide",
    categories: ["tops", "bottoms", "outerwear"],
  },
  prada: {
    brand_name: "Prada",
    url: "https://www.prada.com/us/en/customer-service/size-guide.html",
    categories: ["tops", "outerwear"],
  },
  burberry: {
    brand_name: "Burberry",
    url: "https://us.burberry.com/c/size-guide/",
    categories: ["tops", "outerwear"],
  },
  dior: {
    brand_name: "Dior",
    url: "https://www.dior.com/en_us/fashion/size-guide",
    categories: ["tops", "dresses", "outerwear"],
  },
  "saint-laurent": {
    brand_name: "Saint Laurent",
    url: "https://www.ysl.com/en-us/size-guide",
    categories: ["tops", "outerwear"],
  },
  balenciaga: {
    brand_name: "Balenciaga",
    url: "https://www.balenciaga.com/en-us/size-guide",
    categories: ["tops", "bottoms", "outerwear"],
  },
  fendi: {
    brand_name: "Fendi",
    url: "https://www.fendi.com/us-en/size-guide",
    categories: ["tops"],
  },
  givenchy: {
    brand_name: "Givenchy",
    url: "https://www.givenchy.com/us/en-US/size-guide",
    categories: ["tops"],
  },
  moncler: {
    brand_name: "Moncler",
    url: "https://www.moncler.com/en-us/size-guide.html",
    categories: ["tops", "outerwear"],
  },
  "acne-studios": {
    brand_name: "Acne Studios",
    url: "https://www.acnestudios.com/us/en/size-guide.html",
    categories: ["tops", "bottoms", "outerwear"],
  },
  "ami-paris": {
    brand_name: "AMI Paris",
    url: "https://www.amiparis.com/us/size-guide",
    categories: ["tops", "outerwear"],
  },
  jacquemus: {
    brand_name: "Jacquemus",
    url: "https://www.jacquemus.com/size-guide",
    categories: ["tops", "dresses"],
  },
  versace: {
    brand_name: "Versace",
    url: "https://www.versace.com/us/en/size-guide/",
    categories: ["tops", "bottoms", "outerwear"],
  },
  valentino: {
    brand_name: "Valentino",
    url: "https://www.valentino.com/en-us/size-guide",
    categories: ["tops", "dresses", "outerwear"],
  },
  "stone-island": {
    brand_name: "Stone Island",
    url: "https://www.stoneisland.com/en-us/size-guide",
    categories: ["tops", "bottoms", "outerwear"],
  },

  // ── Multi-Brand Retailers ──
  asos: {
    brand_name: "ASOS",
    url: "https://www.asos.com/us/discover/size-charts/",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
  },
  revolve: {
    brand_name: "Revolve",
    url: "https://www.revolve.com/content/sizechart",
    categories: ["tops", "bottoms", "dresses"],
  },
  simons: {
    brand_name: "Simons",
    url: "https://www.simons.ca/en/size-charts",
    categories: ["tops", "bottoms", "outerwear"],
  },

  // ── Additional brands ──
  topshop: {
    brand_name: "Topshop",
    url: "https://www.asos.com/us/discover/topshop-size-guide/",
    categories: ["tops", "bottoms", "dresses"],
  },
  tommy: {
    brand_name: "Tommy Hilfiger",
    url: "https://usa.tommy.com/en/size-guide",
    categories: ["tops", "bottoms", "outerwear"],
  },
  "vans": {
    brand_name: "Vans",
    url: "https://www.vans.com/size-chart",
    categories: ["tops", "footwear"],
  },
  converse: {
    brand_name: "Converse",
    url: "https://www.converse.com/size-chart",
    categories: ["footwear"],
  },
  reebok: {
    brand_name: "Reebok",
    url: "https://www.reebok.com/us/size_charts",
    categories: ["tops", "activewear", "footwear"],
  },
  "urban-outfitters": {
    brand_name: "Urban Outfitters",
    url: "https://www.urbanoutfitters.com/help/size-charts",
    categories: ["tops", "bottoms", "dresses"],
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
    // Optional batch_size to limit how many items to process per run (useful for cron to stay under timeout)
    const batchSize: number = body.batch_size ?? 999;

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const aiEndpoint = lovableKey
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
    const aiKey = lovableKey || openRouterKey;

    if (!aiKey) {
      return errorResponse("No AI API key configured (LOVABLE_API_KEY or OPENROUTER_API_KEY)", "CONFIG_ERROR", 500, corsHeaders);
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

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    // Fetch HTML via Firecrawl (handles JS + anti-bot), fallback to raw fetch
    async function fetchPageHtml(url: string): Promise<string | null> {
      // Try Firecrawl first
      if (firecrawlKey) {
        try {
          const fcResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url,
              formats: ["html"],
              onlyMainContent: true,
              waitFor: 3000,
            }),
          });
          if (fcResp.ok) {
            const fcData = await fcResp.json();
            const html = fcData?.data?.html || fcData?.html;
            if (html && html.length > 200) {
              console.log(`Firecrawl OK for ${url} (${html.length} chars)`);
              return html;
            }
          } else {
            const errText = await fcResp.text();
            console.warn(`Firecrawl ${fcResp.status} for ${url}: ${errText.slice(0, 100)}`);
          }
        } catch (fcErr) {
          console.warn(`Firecrawl error for ${url}:`, fcErr);
        }
      }

      // Fallback: raw fetch
      try {
        const resp = await fetch(url, { headers: FETCH_HEADERS });
        if (!resp.ok) {
          console.error(`Raw fetch failed for ${url}: ${resp.status}`);
          return null;
        }
        return await resp.text();
      } catch (fetchErr) {
        console.error(`Raw fetch error for ${url}:`, fetchErr);
        return null;
      }
    }

    // Cache fetched HTML per URL to avoid re-fetching for same brand with multiple categories
    const htmlCache: Record<string, string | null> = {};

    for (const item of workList) {
      if (scraped >= batchSize) break;
      scraped++;
      const key = `${item.slug}/${item.category}`;

      try {
        // Fetch HTML (with cache)
        let html = htmlCache[item.config.url];
        if (html === undefined) {
          htmlCache[item.config.url] = await fetchPageHtml(item.config.url);
          html = htmlCache[item.config.url];
        }

        if (!html) {
          failed.push(key);
          continue;
        }

        // Call AI
        const aiResp = await fetch(aiEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${aiKey}`,
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
          console.error(`AI error for ${key}: ${aiResp.status} ${errText}`);
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

        // Normalize size_data keys
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

    return successResponse({ scraped, inserted, skipped, failed, total_brands: Object.keys(RETAILERS).length }, 200, corsHeaders);
  } catch (e) {
    console.error("scrape-size-charts error:", e);
    return errorResponse((e as any).message || "Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
