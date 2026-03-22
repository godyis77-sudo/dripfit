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

// Beautiful, portrait-oriented backdrop queries ideal for full-body person overlays.
// Focus: spacious vertical composition, stunning lighting, no humans.
const CATEGORY_QUERIES: Record<string, string[]> = {
  "street-urban": [
    "beautiful empty city street golden hour vertical",
    "aesthetic urban alley colorful walls no people",
    "cinematic city sidewalk night lights empty",
    "stunning graffiti wall urban backdrop empty",
  ],
  "studio-minimal": [
    "professional photography studio backdrop empty clean",
    "elegant white cyclorama studio lighting empty",
    "minimalist beige textured wall studio backdrop",
    "soft gradient studio background pastel empty",
  ],
  "nature-outdoor": [
    "beautiful forest path sunlight rays no people",
    "stunning flower field golden hour landscape empty",
    "scenic mountain trail vista no person",
    "lush green garden pathway beautiful empty",
  ],
  "architecture": [
    "grand architecture columns symmetry empty beautiful",
    "modern glass building reflection empty stunning",
    "elegant staircase marble interior empty",
    "beautiful archway corridor perspective empty",
  ],
  "luxury-interior": [
    "luxurious hotel lobby marble floor empty elegant",
    "beautiful mansion interior chandelier empty room",
    "opulent art gallery white walls empty spacious",
    "elegant ballroom golden light empty stunning",
  ],
  "nightlife-neon": [
    "beautiful neon lights alley night cyberpunk empty",
    "stunning neon sign wall purple pink glow empty",
    "cinematic rainy night street neon reflections empty",
    "vibrant led lights corridor futuristic empty",
  ],
  "spring-summer": [
    "beautiful tropical beach sunset golden hour empty",
    "stunning cherry blossom path spring empty",
    "gorgeous palm tree boulevard blue sky empty",
    "idyllic lavender field sunset no people",
  ],
  "fall-winter": [
    "beautiful autumn leaves path golden light empty",
    "stunning snowy forest winter wonderland empty",
    "gorgeous foggy mountain morning landscape empty",
    "cozy autumn street fallen leaves no person",
  ],
  "travel-iconic": [
    "paris eiffel tower beautiful skyline no people",
    "stunning tokyo street neon signs empty",
    "beautiful santorini blue dome sunset empty",
    "gorgeous new york skyline rooftop view empty",
  ],
  "sports-active": [
    "beautiful empty basketball court sunset golden hour",
    "stunning running track stadium empty aerial",
    "aesthetic skatepark concrete empty golden light",
    "gorgeous tennis court empty overhead view",
  ],
  "abstract-artistic": [
    "beautiful abstract colorful mural wall artistic",
    "stunning holographic gradient background iridescent",
    "gorgeous marble texture gold veins luxury",
    "aesthetic paint splatter wall colorful artistic",
  ],
};

// Words indicating a photo contains people — filter these out
const PEOPLE_KEYWORDS = [
  "person", "people", "man", "woman", "girl", "boy", "model",
  "portrait", "face", "selfie", "couple", "child", "kid", "baby",
  "group", "crowd", "dancer", "athlete", "posing", "smiling",
  "fashion model", "headshot", "wedding", "family", "friends",
];

// Minimum image dimensions for a quality full-body backdrop
const MIN_WIDTH = 800;
const MIN_HEIGHT = 1000;

function looksLikePeoplePhoto(photo: { alt?: string }): boolean {
  const alt = (photo.alt || "").toLowerCase();
  return PEOPLE_KEYWORDS.some((kw) => alt.includes(kw));
}

function isTooSmall(photo: { width?: number; height?: number }): boolean {
  return (photo.width || 0) < MIN_WIDTH || (photo.height || 0) < MIN_HEIGHT;
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

  const url = new URL(req.url);
  const shouldReplace = url.searchParams.get("replace") === "true";

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

  if (shouldReplace) {
    const { error: delErr } = await sb
      .from("backgrounds")
      .delete()
      .eq("source", "pexels");
    if (delErr) console.error("Delete old pexels backgrounds error:", delErr);
  }

  const rows: BgRow[] = [];
  const seenIds = new Set<string>();
  let filteredPeople = 0;
  let filteredSmall = 0;

  for (const [slug, queries] of Object.entries(CATEGORY_QUERIES)) {
    const catId = slugToId.get(slug);
    if (!catId) continue;

    for (const query of queries) {
      try {
        // Fetch 15 results to have enough after filtering people + small images
        const res = await fetch(
          `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=15&orientation=portrait`,
          { headers: { Authorization: pexelsKey } }
        );
        if (!res.ok) {
          console.error(`Pexels error for "${query}": ${res.status}`);
          continue;
        }
        const data = await res.json();
        let kept = 0;
        for (const photo of data.photos || []) {
          if (kept >= 4) break;

          if (looksLikePeoplePhoto(photo)) {
            filteredPeople++;
            continue;
          }

          if (isTooSmall(photo)) {
            filteredSmall++;
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
              .filter((t: string) => t.length > 2 && !["people", "person", "empty", "no"].includes(t)),
          });
        }
      } catch (e) {
        console.error(`Fetch failed for "${query}":`, e);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }

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
      filtered_people: filteredPeople,
      filtered_small: filteredSmall,
      inserted: newRows.length,
      replaced: shouldReplace,
      categories: Object.keys(CATEGORY_QUERIES).length,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
