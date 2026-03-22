import { getCorsHeaders } from "../_shared/validation.ts";

const PEXELS_BASE = "https://api.pexels.com/v1";
const UNSPLASH_BASE = "https://api.unsplash.com";

interface PhotoResult {
  id: string;
  url: string;
  thumb: string;
  photographer: string;
  source: "pexels" | "unsplash";
  sourceUrl: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, page = 1, perPage = 20 } = await req.json();
    if (!query || typeof query !== "string" || query.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pexelsKey = Deno.env.get("PEXELS_API_KEY");
    const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY");

    const results: PhotoResult[] = [];

    // Primary: Pexels
    if (pexelsKey) {
      try {
        const res = await fetch(
          `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`,
          { headers: { Authorization: pexelsKey } }
        );
        if (res.ok) {
          const data = await res.json();
          for (const photo of data.photos || []) {
            results.push({
              id: `pexels-${photo.id}`,
              url: photo.src.large2x || photo.src.large,
              thumb: photo.src.medium,
              photographer: photo.photographer,
              source: "pexels",
              sourceUrl: photo.url,
            });
          }
        } else {
          console.error("Pexels error:", res.status, await res.text());
        }
      } catch (e) {
        console.error("Pexels fetch failed:", e);
      }
    }

    // Fallback/supplement: Unsplash (if Pexels returned < 5 results)
    if (unsplashKey && results.length < 5) {
      try {
        const res = await fetch(
          `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.min(perPage, 30)}&page=${page}&orientation=portrait`,
          { headers: { Authorization: `Client-ID ${unsplashKey}` } }
        );
        if (res.ok) {
          const data = await res.json();
          for (const photo of data.results || []) {
            results.push({
              id: `unsplash-${photo.id}`,
              url: photo.urls.regular,
              thumb: photo.urls.small,
              photographer: photo.user.name,
              source: "unsplash",
              sourceUrl: photo.links.html,
            });
          }
        } else {
          console.error("Unsplash error:", res.status, await res.text());
        }
      } catch (e) {
        console.error("Unsplash fetch failed:", e);
      }
    }

    return new Response(JSON.stringify({ results, total: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
