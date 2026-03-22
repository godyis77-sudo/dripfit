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

const CATEGORY_QUERIES: Record<string, string[]> = {
  "street-urban": ["urban street style photography", "city graffiti wall"],
  "studio-minimal": ["minimal white studio backdrop", "grey studio photography background"],
  "nature-outdoor": ["forest trail nature portrait", "green park outdoor scenic"],
  "architecture": ["modern architecture building", "concrete brutalist facade"],
  "luxury-interior": ["luxury marble interior", "elegant room chandelier decor"],
  "nightlife-neon": ["neon lights city night", "club neon sign urban"],
  "spring-summer": ["summer beach golden hour", "spring cherry blossom garden"],
  "fall-winter": ["autumn leaves orange forest", "winter snow mountain landscape"],
  "travel-iconic": ["paris eiffel tower scenic", "tokyo shibuya crossing"],
  "sports-active": ["basketball court outdoor", "running track stadium"],
  "abstract-artistic": ["abstract colorful paint texture", "gradient artistic background"],
};

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
  const rows: BgRow[] = [];
  const seenIds = new Set<string>();

  for (const [slug, queries] of Object.entries(CATEGORY_QUERIES)) {
    const catId = slugToId.get(slug);
    if (!catId) continue;

    for (const query of queries) {
      try {
        const res = await fetch(
          `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=4&orientation=portrait`,
          { headers: { Authorization: pexelsKey } }
        );
        if (!res.ok) {
          console.error(`Pexels error for "${query}": ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const photo of data.photos || []) {
          const sid = String(photo.id);
          if (seenIds.has(sid)) continue;
          seenIds.add(sid);
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
            tags: query.split(" ").filter((t: string) => t.length > 2),
          });
        }
      } catch (e) {
        console.error(`Fetch failed for "${query}":`, e);
      }
      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Upsert into backgrounds
  if (rows.length > 0) {
    const { error } = await sb.from("backgrounds").upsert(rows, {
      onConflict: "source_id",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message, count: 0 }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(
    JSON.stringify({ success: true, count: rows.length, categories: Object.keys(CATEGORY_QUERIES).length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
