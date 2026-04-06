import { getCorsHeaders } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Generate an AI model image wearing all items in a weekly outfit.
 *
 * POST body:
 *   outfit_id: string (uuid)          — which outfit to generate for
 *   background_style?: string         — optional background description
 *   regenerate?: boolean              — overwrite existing hero image
 *
 * Or generate for ALL outfits in a week:
 *   week_id: string (e.g. "2026-W15") — generate heroes for all outfits in this week
 */

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

const BACKGROUND_STYLES: Record<string, string> = {
  night_out: "a trendy rooftop bar at night with city lights in the background, moody warm lighting",
  beach_day: "a beautiful tropical beach at golden hour, turquoise water and white sand",
  lunch_date: "an elegant outdoor café terrace with soft afternoon sunlight",
  date_night: "a sophisticated restaurant interior with warm candlelight and exposed brick",
  weekend_casual: "a stylish urban sidewalk with modern architecture, natural daylight",
  office: "a modern minimalist office lobby with natural light and clean lines",
  gym: "a sleek modern gym interior with motivational atmosphere",
  festival: "a vibrant outdoor music festival scene with colorful lights",
  brunch: "a bright airy café with plants and natural wood, morning sunlight",
  wedding: "an elegant garden venue with soft romantic lighting and flowers",
};

function buildPrompt(items: Array<{ product_name: string; brand: string | null; category: string | null; image_url: string | null }>, occasion: string, bgStyle?: string): { text: string; imageUrls: string[] } {
  const bg = bgStyle || BACKGROUND_STYLES[occasion] || "a stylish urban environment with beautiful lighting";

  const itemDescriptions = items.map((item, i) => {
    const brand = item.brand ? ` by ${item.brand}` : "";
    const cat = item.category ? ` (${item.category})` : "";
    return `${i + 1}. ${item.product_name}${brand}${cat}`;
  }).join("\n");

  const imageUrls = items
    .map(i => i.image_url)
    .filter((url): url is string => !!url);

  const text = `Generate a full-body fashion photo of a stylish model wearing this complete outfit. The model should be standing in a natural, confident pose.

OUTFIT ITEMS:
${itemDescriptions}

IMPORTANT INSTRUCTIONS:
- The model should be wearing ALL the items listed above as a complete outfit
- Match the style, colors, and details of each clothing item as closely as possible to the reference images provided
- Full body shot showing head to toe, portrait/vertical orientation (3:4 aspect ratio)
- The model should look like a real person, natural and editorial
- Background: ${bg}
- Professional fashion photography lighting
- No text, no watermarks, no logos overlay
- The outfit should look cohesive and styled together`;

  return { text, imageUrls };
}

async function generateHeroImage(
  prompt: { text: string; imageUrls: string[] },
  apiKey: string
): Promise<string | null> {
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: prompt.text },
  ];

  // Attach product reference images
  for (const url of prompt.imageUrls.slice(0, 6)) {
    content.push({ type: "image_url", image_url: { url } });
  }

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`AI gateway error ${res.status}:`, errText);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 402) throw new Error("PAYMENT_REQUIRED");
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
}

async function uploadHero(
  sb: ReturnType<typeof createClient>,
  base64Data: string,
  outfitId: string
): Promise<string | null> {
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));
  const fileName = `outfit-heroes/${outfitId}.png`;

  const { error } = await sb.storage
    .from("backgrounds-curated")
    .upload(fileName, bytes, { contentType: "image/png", upsert: true });

  if (error) {
    console.error("Storage upload error:", error);
    return null;
  }

  return sb.storage.from("backgrounds-curated").getPublicUrl(fileName).data.publicUrl;
}

async function processOutfit(
  sb: ReturnType<typeof createClient>,
  outfitId: string,
  apiKey: string,
  bgStyle?: string,
  regenerate = false
): Promise<{ success: boolean; outfit_id: string; hero_url?: string; error?: string; skipped?: boolean }> {
  // Fetch outfit
  const { data: outfit, error: oErr } = await sb
    .from("weekly_outfits")
    .select("id, occasion, title, hero_image_url")
    .eq("id", outfitId)
    .single();

  if (oErr || !outfit) {
    return { success: false, outfit_id: outfitId, error: "Outfit not found" };
  }

  // Skip if already has hero and not regenerating
  if (outfit.hero_image_url && !regenerate) {
    return { success: true, outfit_id: outfitId, hero_url: outfit.hero_image_url, skipped: true };
  }

  // Fetch items
  const { data: items } = await sb
    .from("weekly_outfit_items")
    .select("product_name, brand, category, image_url")
    .eq("outfit_id", outfitId)
    .order("position", { ascending: true });

  if (!items || items.length === 0) {
    return { success: false, outfit_id: outfitId, error: "No items in outfit" };
  }

  console.log(`Generating hero for outfit "${outfit.title}" (${items.length} items)`);

  const prompt = buildPrompt(items, outfit.occasion, bgStyle);
  const base64 = await generateHeroImage(prompt, apiKey);

  if (!base64) {
    return { success: false, outfit_id: outfitId, error: "Image generation failed" };
  }

  const publicUrl = await uploadHero(sb, base64, outfitId);
  if (!publicUrl) {
    return { success: false, outfit_id: outfitId, error: "Upload failed" };
  }

  // Update outfit with hero URL
  const { error: updateErr } = await sb
    .from("weekly_outfits")
    .update({ hero_image_url: publicUrl })
    .eq("id", outfitId);

  if (updateErr) {
    return { success: false, outfit_id: outfitId, error: updateErr.message };
  }

  return { success: true, outfit_id: outfitId, hero_url: publicUrl };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { outfit_id?: string; week_id?: string; background_style?: string; regenerate?: boolean } = {};
  try { body = await req.json(); } catch { /* defaults */ }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  // Single outfit
  if (body.outfit_id) {
    try {
      const result = await processOutfit(sb, body.outfit_id, apiKey, body.background_style, body.regenerate);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      const status = msg === "RATE_LIMITED" ? 429 : msg === "PAYMENT_REQUIRED" ? 402 : 500;
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Batch by week
  if (body.week_id) {
    const { data: outfits } = await sb
      .from("weekly_outfits")
      .select("id")
      .eq("week_id", body.week_id)
      .eq("is_active", true);

    if (!outfits || outfits.length === 0) {
      return new Response(JSON.stringify({ error: "No outfits found for week", week_id: body.week_id }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const o of outfits) {
      try {
        const result = await processOutfit(sb, o.id, apiKey, body.background_style, body.regenerate);
        results.push(result);
        // Small delay between generations to avoid rate limits
        if (results.length < outfits.length) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (e) {
        results.push({ success: false, outfit_id: o.id, error: e instanceof Error ? e.message : "Unknown" });
        if (e instanceof Error && e.message === "RATE_LIMITED") {
          // Wait longer on rate limit
          await new Promise(r => setTimeout(r, 10000));
        }
      }
    }

    return new Response(JSON.stringify({
      week_id: body.week_id,
      total: outfits.length,
      generated: results.filter(r => r.success && !r.skipped).length,
      skipped: results.filter(r => r.skipped).length,
      failed: results.filter(r => !r.success).length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({
    usage: "POST with { outfit_id: 'uuid' } or { week_id: '2026-W15' }",
    options: { background_style: "custom background description", regenerate: true },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
