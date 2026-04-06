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
  night_out: "a high-end rooftop lounge at night, dramatic cinematic lighting with warm amber and cool blue neon reflections on glass, city skyline bokeh, editorial Vogue-level atmosphere",
  beach_day: "a luxury Mediterranean beach club at golden hour, warm honeyed sunlight, turquoise water, white linen cabanas, Slim Aarons-inspired composition",
  lunch_date: "an upscale Parisian sidewalk café, dappled afternoon sunlight through plane trees, marble tabletops, champagne tones, effortlessly chic atmosphere",
  date_night: "an intimate high-end cocktail bar, moody dramatic lighting with warm tungsten highlights, dark velvet textures, editorial GQ/Esquire mood",
  weekend_casual: "a sun-drenched modernist concrete terrace overlooking a city, golden hour rim lighting, architectural shadows, clean luxury streetwear editorial vibe",
  office: "a sleek glass-walled corner office with panoramic city views, soft directional window light, minimal furniture, power-dressing editorial atmosphere",
  gym: "a premium private gym with floor-to-ceiling windows, dramatic side lighting, concrete and steel aesthetic, athletic editorial shoot",
  festival: "a vibrant desert festival scene at dusk, warm stage glow mixed with purple-orange sunset, dust particles in backlight, high-fashion festival editorial",
  brunch: "a sunlit greenhouse café with lush tropical plants, soft diffused morning light, brass and marble accents, lifestyle editorial mood",
  wedding: "an elegant estate garden at golden hour, soft romantic backlight through old-growth trees, petal-strewn stone path, luxury fashion editorial",
};

const STYLING_NOTES: Record<string, string> = {
  night_out: "Styled with intentional streetwear layering — an open jacket over a statement piece, accessories visible. Confident nightlife energy.",
  beach_day: "Relaxed luxury resort styling — effortless drape, rolled sleeves or untucked layers, premium casual silhouette.",
  lunch_date: "Polished elevated casual — clean proportions, thoughtful layering, mixing textures like knit over cotton.",
  date_night: "Sharp contemporary layering — structured outerwear over fitted pieces, monochromatic or tonal color story.",
  weekend_casual: "Premium streetwear layering — oversized over fitted, brand-mixing done intentionally, sneakers styled up.",
  office: "Power-casual editorial — tailored pieces mixed with one streetwear element, confident silhouette.",
  gym: "Technical athleisure — clean performance pieces styled as a cohesive look, not gym-random.",
  festival: "Statement streetwear maximalism — bold layering, mixed prints/textures, festival-ready but high-fashion.",
  brunch: "Effortless luxury casual — soft textures, relaxed fits, earthy or pastel palette, approachable elegance.",
  wedding: "Elevated formal with personality — tailored foundation with one unexpected streetwear or luxury accent piece.",
};

function buildPrompt(items: Array<{ product_name: string; brand: string | null; category: string | null; image_url: string | null }>, occasion: string, bgStyle?: string): { text: string; imageUrls: string[] } {
  const bg = bgStyle || BACKGROUND_STYLES[occasion] || "a premium minimalist studio with dramatic directional lighting, concrete walls, editorial fashion photography atmosphere";
  const styling = STYLING_NOTES[occasion] || "Intentional luxury streetwear layering — mixing high-end and contemporary brands with confident, editorial proportions.";

  const brands = items.map(i => i.brand).filter(Boolean);
  const uniqueBrands = [...new Set(brands)];
  const brandContext = uniqueBrands.length > 0
    ? `This is a curated ${uniqueBrands.join(" × ")} look.`
    : "This is a curated multi-brand look.";

  const itemDescriptions = items.map((item, i) => {
    const brand = item.brand ? ` by ${item.brand}` : "";
    const cat = item.category ? ` (${item.category})` : "";
    return `${i + 1}. ${item.product_name}${brand}${cat}`;
  }).join("\n");

  const imageUrls = items
    .map(i => i.image_url)
    .filter((url): url is string => !!url);

  const text = `You are a world-class fashion photographer shooting a luxury streetwear editorial campaign. Generate a stunning full-body photograph of a model wearing this complete outfit.

${brandContext}

OUTFIT PIECES:
${itemDescriptions}

STYLING DIRECTION:
${styling}

PHOTOGRAPHY REQUIREMENTS:
- Full body shot, head to toe, portrait orientation (3:4 aspect ratio)
- The model MUST be wearing ALL items listed above as one cohesive styled outfit
- Match colors, patterns, textures, and silhouettes precisely to the reference product images
- Dynamic natural pose — walking, mid-stride, or leaning casually — NOT stiff or mannequin-like
- Model should look like a real person with natural skin, contemporary hairstyle, confident expression
- LIGHTING: Professional editorial lighting — dramatic rim light, soft fill, cinematic color grading with depth
- BACKGROUND: ${bg}
- Depth of field: subject sharp, background with beautiful natural bokeh
- Color grade: rich, slightly warm, high-end fashion magazine aesthetic (think SSENSE or Mr Porter editorial)
- NO text, NO watermarks, NO logos, NO brand names overlaid on the image
- NO mannequins, NO flat-lay, NO product-only shots — this must be a styled ON-BODY editorial photo
- The outfit should look intentionally layered and styled, not just "wearing clothes"`;

  return { text, imageUrls };
}

async function checkImageAccessible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

async function generateHeroImage(
  prompt: { text: string; imageUrls: string[] },
  apiKey: string
): Promise<string | null> {
  // Pre-filter images that are actually accessible
  const accessChecks = await Promise.all(
    prompt.imageUrls.slice(0, 6).map(async (url) => ({
      url,
      ok: await checkImageAccessible(url),
    }))
  );
  const accessibleUrls = accessChecks.filter((c) => c.ok).map((c) => c.url);
  console.log(`Image accessibility: ${accessibleUrls.length}/${prompt.imageUrls.length} accessible`);

  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: prompt.text },
  ];

  for (const url of accessibleUrls) {
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
