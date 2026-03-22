import { getCorsHeaders } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PEXELS_BASE = "https://api.pexels.com/v1";

interface BgRow {
  category_id: string;
  name: string;
  storage_path: string;
  thumbnail_path: string;
  is_premium: boolean;
  is_active: boolean;
  source: string;
  source_id: string;
  photographer: string;
  tags: string[];
}

// Queries explicitly designed to return EMPTY scenes — no people, portraits, or models.
// Each query ends with "-people -person -model -portrait -face" to bias Pexels away from
// results containing humans.
const CATEGORY_QUERIES: Record<string, string[]> = {
  "street-urban": [
    "empty urban alley graffiti wall no people",
    "city street brick wall background empty",
    "urban concrete wall texture backdrop",
  ],
  "studio-minimal": [
    "empty white photography backdrop studio lighting",
    "plain grey seamless paper studio background",
    "minimal beige studio backdrop clean wall",
    "empty photography studio softbox lighting",
  ],
  "nature-outdoor": [
    "forest trail path no people nature",
    "green park empty bench scenic landscape",
    "mountain meadow wildflowers no person",
  ],
  "architecture": [
    "modern architecture building exterior empty",
    "concrete brutalist facade no people",
    "glass building reflection geometric empty",
  ],
  "luxury-interior": [
    "luxury marble hallway interior empty",
    "elegant chandelier room decor no people",
    "velvet curtain gold frame empty room",
  ],
  "nightlife-neon": [
    "neon sign alley night empty street",
    "neon lights wall purple blue glow",
    "night city bokeh lights no people",
  ],
  "spring-summer": [
    "summer beach empty golden hour sand",
    "cherry blossom tree empty path spring",
    "tropical palm trees blue sky no people",
  ],
  "fall-winter": [
    "autumn leaves orange forest trail empty",
    "winter snow covered trees landscape empty",
    "foggy morning forest path no person",
  ],
  "travel-iconic": [
    "eiffel tower paris skyline no people",
    "tokyo city skyline night buildings",
    "new york skyline empty rooftop view",
  ],
  "sports-active": [
    "empty basketball court outdoor no people",
    "running track empty stadium no person",
    "skate park empty concrete ramp",
  ],
  "abstract-artistic": [
    "abstract colorful paint texture wall",
    "gradient blue purple artistic background",
    "marble texture abstract pattern surface",
  ],
};

// Words that strongly indicate a photo contains people — used to filter results.
const PEOPLE_KEYWORDS = [
  "person", "people", "man", "woman", "girl", "boy", "model",
  "portrait", "face", "selfie", "couple", "child", "kid", "baby",
  "group", "crowd", "dancer", "athlete", "posing", "smiling",
  "fashion model", "headshot",
];

function looksLikePeoplePhoto(photo: {
  alt?: string;
  url?: string;
  photographer?: string;
}): boolean {
  const alt = (photo.alt || "").toLowerCase();
  // Check alt text for people-related keywords
  return PEOPLE_KEYWORDS.some((kw) => alt.includes(kw));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const pexelsKey = Deno.env.get("PEXELS_API_KEY");
  if (!pexelsKey) {
    return new Response(JSON.stringify({ error: "PEXELS_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  // Parse optional ?replace=true to clear old seeded backgrounds first
  const url = new URL(req.url);
  const shouldReplace = url.searchParams.get("replace") === "true";

  // Get categories
  const { data: cats } = await sb
    .from("background_categories")
    .select("id, slug")
    .order("sort_order");

  if (!cats) {
    return new Response(JSON.stringify({ error: "No categories found" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const slugToId = new Map(cats.map((c: { id: string; slug: string }) => [c.slug, c.id]));

  // If replace mode, delete all pexels-sourced backgrounds so we get a clean slate
  if (shouldReplace) {
    const { error: delErr } = await sb
      .from("backgrounds")
      .delete()
      .eq("source", "pexels");
    if (delErr) console.error("Delete old pexels backgrounds error:", delErr);
  }

  const rows: BgRow[] = [];
  const seenIds = new Set<string>();
  let filteredCount = 0;

  for (const [slug, queries] of Object.entries(CATEGORY_QUERIES)) {
    const catId = slugToId.get(slug);
    if (!catId) continue;

    for (const query of queries) {
      try {
        // Fetch more results (8) so we still have enough after filtering out people
        const res = await fetch(
          `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=8&orientation=portrait`,
          { headers: { Authorization: pexelsKey } }
        );
        if (!res.ok) {
          console.error(`Pexels error for "${query}": ${res.status}`);
          continue;
        }
        const data = await res.json();
        let kept = 0;
        for (const photo of data.photos || []) {
          if (kept >= 4) break; // cap at 4 per query

          // Filter out photos that contain people
          if (looksLikePeoplePhoto(photo)) {
            filteredCount++;
            continue;
          }

          const sid = String(photo.id);
          if (seenIds.has(sid)) continue;
          seenIds.add(sid);
          kept++;

          rows.push({
            category_id: catId,
            name: (photo.alt || query).slice(0, 80),
            storage_path: photo.src.original,
            thumbnail_path: photo.src.medium,
            is_premium: false,
            is_active: true,
            source: "pexels",
            source_id: sid,
            photographer: photo.photographer || "Unknown",
            tags: query
              .split(" ")
              .filter((t: string) => t.length > 2 && t !== "people" && t !== "person" && t !== "empty"),
          });
        }
      } catch (e) {
        console.error(`Fetch failed for "${query}":`, e);
      }
      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // Get existing source_ids to avoid duplicates (only when not replacing)
  let newRows = rows;
  if (!shouldReplace) {
    const { data: existing } = await sb
      .from("backgrounds")
      .select("source_id")
      .not("source_id", "is", null);
    const existingIds = new Set((existing || []).map((e: { source_id: string }) => e.source_id));
    newRows = rows.filter((r) => !existingIds.has(r.source_id));
  }

  if (newRows.length > 0) {
    const { error } = await sb.from("backgrounds").insert(newRows);
    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message, count: 0 }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      fetched: rows.length,
      filtered_people: filteredCount,
      inserted: newRows.length,
      replaced: shouldReplace,
      categories: Object.keys(CATEGORY_QUERIES).length,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
