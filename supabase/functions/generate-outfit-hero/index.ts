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

/* ── Occasion → Background ────────────────────────────────────── */

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

/* ── Occasion → Styling notes ─────────────────────────────────── */

const STYLING_NOTES: Record<string, string> = {
  night_out: "Styled with intentional streetwear layering — open jacket over a statement piece, accessories visible. Confident nightlife energy.",
  beach_day: "Relaxed luxury resort styling — effortless drape, rolled sleeves or untucked layers, premium casual silhouette.",
  lunch_date: "Polished elevated casual — clean proportions, thoughtful layering, mixing textures like knit over cotton.",
  date_night: "Sharp contemporary layering — structured outerwear over fitted pieces, monochromatic or tonal color story.",
  weekend_casual: "Premium streetwear layering — oversized over fitted, brand-mixing done intentionally, sneakers styled up.",
  office: "Power-casual editorial — tailored pieces mixed with one streetwear element, confident silhouette.",
  gym: "Technical athleisure — clean performance pieces styled as a cohesive look, not gym-random.",
  festival: "Statement streetwear maximalism — bold layering, mixed prints/textures, festival-ready but high-fashion.",
  brunch: "Effortless luxury casual — soft textures, relaxed fits, earthy or pastel palette, approachable elegance.",
  wedding: "Elevated formal with personality — tailored foundation with one unexpected luxury accent piece.",
};

/* ── Occasion → Footwear guidance ─────────────────────────────── */

const FOOTWEAR_GUIDE: Record<string, string> = {
  night_out: "sleek pointed-toe boots or premium low-profile sneakers, polished finish",
  beach_day: "premium slides, espadrilles, or clean low-cut canvas shoes — never heavy boots",
  lunch_date: "clean minimalist leather loafers, ballet flats, or designer sneakers",
  date_night: "heeled boots, pointed-toe shoes, or elevated dress sneakers",
  weekend_casual: "fresh designer sneakers, lifestyle runners, or premium mules",
  office: "monk-strap shoes, leather chelsea boots, structured flats, or clean minimal sneakers",
  gym: "performance running shoes or cross-training sneakers",
  festival: "chunky platform boots, bold designer sneakers, or statement sandals",
  brunch: "clean white sneakers, espadrilles, mules, or strappy sandals",
  wedding: "polished leather dress shoes, heeled sandals, or satin pumps",
};

/* ── Gender model descriptions ────────────────────────────────── */

const GENDER_MODELS: Record<string, string> = {
  mens: "a fit male model in his mid-20s with contemporary hairstyle, subtle stubble, strong jawline, naturally confident expression — think Vogue Homme or GQ editorial",
  womens: "a stylish female model in her mid-20s with contemporary hairstyle, natural makeup, effortlessly chic expression — think Vogue or SSENSE editorial",
};

/* ── Pose / angle variety ─────────────────────────────────────── */

const POSE_POOL = [
  "walking mid-stride with one hand adjusting collar, slight 3/4 turn to camera",
  "leaning against a wall with arms crossed, looking off-camera with a slight smirk",
  "standing with weight on back foot, one hand in pocket, direct eye contact",
  "caught mid-motion turning around, looking over shoulder at camera",
  "sitting on a low ledge with legs extended, relaxed editorial energy",
  "power stance with feet shoulder-width apart, hands at sides, strong eye contact",
  "walking toward camera with confident stride, slight wind in clothing",
  "perched on stairs, one knee up, arm resting casually, looking upward",
  "standing profile view with head turned toward camera, dramatic silhouette",
  "crouching low with elbows on knees, streetwear editorial energy",
  "leaning forward slightly with hands in jacket pockets, intimate close-distance feel",
  "standing tall with chin up, one arm raised adjusting sunglasses or hat",
];

/* ── Color extraction helpers ─────────────────────────────────── */

function extractColorHints(items: OutfitItem[]): string {
  const names = items.map(i => `${i.product_name} ${i.brand || ""}`).join(" ").toLowerCase();

  const colorKeywords = [
    "black", "white", "cream", "ivory", "alabaster", "navy", "blue", "indigo",
    "red", "burgundy", "maroon", "wine", "green", "olive", "sage", "khaki",
    "grey", "gray", "charcoal", "slate", "beige", "tan", "camel", "sand",
    "brown", "chocolate", "espresso", "pink", "blush", "rose", "coral",
    "orange", "rust", "burnt", "yellow", "gold", "purple", "plum", "lavender",
    "glacier", "washed", "faded", "vintage", "dune",
  ];

  const found = colorKeywords.filter(c => names.includes(c));
  if (found.length === 0) return "";

  const unique = [...new Set(found)];
  return `\nDOMINANT COLOR PALETTE: The products feature these tones — ${unique.join(", ")}. Ensure the model's outfit reflects these exact colors cohesively. The overall color story should feel intentional and harmonious, not random.`;
}

/* ── Type ─────────────────────────────────────────────────────── */

interface OutfitItem {
  product_name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
}

/* ── Prompt builder ───────────────────────────────────────────── */

function buildPrompt(
  items: OutfitItem[],
  occasion: string,
  gender: string | null,
  bgStyle?: string,
  poseIndex?: number
): { text: string; imageUrls: string[] } {
  const pose = POSE_POOL[poseIndex !== undefined ? poseIndex % POSE_POOL.length : Math.floor(Math.random() * POSE_POOL.length)];
  const bg = bgStyle || BACKGROUND_STYLES[occasion] || "a premium minimalist studio with dramatic directional lighting, concrete walls, editorial fashion photography atmosphere";
  const styling = STYLING_NOTES[occasion] || "Intentional luxury streetwear layering — mixing high-end and contemporary brands with confident, editorial proportions.";
  const footwear = FOOTWEAR_GUIDE[occasion] || "premium designer sneakers or clean leather shoes appropriate for the occasion";

  // Gender-specific model
  const genderKey = gender === "womens" ? "womens" : "mens";
  const modelDesc = GENDER_MODELS[genderKey];

  const brands = items.map(i => i.brand).filter(Boolean);
  const uniqueBrands = [...new Set(brands)];
  const brandContext = uniqueBrands.length > 0
    ? `This is a curated ${uniqueBrands.join(" × ")} look.`
    : "This is a curated multi-brand look.";

  // Check if outfit includes footwear
  const hasFootwear = items.some(i => {
    const cat = (i.category || "").toLowerCase();
    const name = (i.product_name || "").toLowerCase();
    return cat.includes("shoe") || cat.includes("footwear") || cat.includes("sneaker") || cat.includes("boot") || cat.includes("slipper") || cat.includes("sandal") ||
      name.includes("shoe") || name.includes("sneaker") || name.includes("boot") || name.includes("slipper") || name.includes("sandal") || name.includes("loafer") || name.includes("heel") || name.includes("pump") || name.includes("ballerina") || name.includes("mule");
  });

  const footwearInstruction = hasFootwear
    ? `The outfit includes specific footwear — the model MUST be wearing the exact shoes/sneakers listed above. Match the shoe design precisely from the reference images.`
    : `No specific footwear is in this outfit — style the model with ${footwear} that complement the overall look and occasion.`;

  const itemDescriptions = items.map((item, i) => {
    const brand = item.brand ? ` by ${item.brand}` : "";
    const cat = item.category ? ` [${item.category}]` : "";
    return `${i + 1}. ${item.product_name}${brand}${cat}`;
  }).join("\n");

  const colorHints = extractColorHints(items);

  const imageUrls = items
    .map(i => i.image_url)
    .filter((url): url is string => !!url);

  const text = `You are a world-class fashion photographer. Generate a stunning full-body editorial photograph of a model wearing a specific outfit.

CRITICAL — PRODUCT FIDELITY IS THE #1 PRIORITY:
You are provided reference product images. The model MUST be wearing items that are VISUALLY IDENTICAL to those reference images. This means:
- EXACT same colors, prints, graphics, logos, and text as shown in the product photos
- EXACT same silhouette, cut, and proportions
- If a t-shirt has a specific graphic print, reproduce that EXACT graphic — do NOT invent a different one
- If pants have specific panel colors or stripe patterns, match them EXACTLY
- Brand logos and text on garments must match the reference photos precisely
- Do NOT substitute, reinterpret, or "inspired by" — COPY the garments exactly as shown

MODEL:
${modelDesc}

${brandContext}

OUTFIT PIECES (every item MUST be worn — match each reference image EXACTLY):
${itemDescriptions}

STYLING DIRECTION:
${styling}

FOOTWEAR:
${footwearInstruction}
${colorHints}

PHOTOGRAPHY REQUIREMENTS:
- Full body shot, head to toe, portrait orientation (3:4 aspect ratio)
- The model MUST be wearing ALL items listed above — each one must be recognizable as the exact product from its reference image
- SPECIFIC POSE: ${pose}
- Dynamic natural energy — NOT stiff or mannequin-like
- Model should look like a real person with natural skin, contemporary hairstyle, confident expression
- Gender-appropriate fit and drape — ${genderKey === "womens" ? "feminine silhouette, natural curves" : "masculine build, clean lines"}
- LIGHTING: Professional editorial lighting — dramatic rim light, soft fill, cinematic color grading
- BACKGROUND: ${bg}
- Depth of field: subject sharp, background with beautiful natural bokeh
- Color grade: rich, slightly warm, high-end fashion magazine aesthetic
- NO text, NO watermarks, NO logos overlaid on image (but product graphics/logos ON the garments must be preserved)
- NO mannequins, NO flat-lay, NO product-only shots — ONLY styled on-body editorial
- The outfit should look intentionally layered and styled by a professional stylist

FINAL CHECK: Before generating, verify each garment matches its reference image in color, pattern, graphic, and silhouette. If a product has text or a logo printed on it, that text/logo must appear correctly on the model's clothing.`;

  return { text, imageUrls };
}

/* ── Image accessibility check ────────────────────────────────── */

async function checkImageAccessible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

/* ── AI image generation ──────────────────────────────────────── */

async function generateHeroImage(
  prompt: { text: string; imageUrls: string[] },
  apiKey: string
): Promise<string | null> {
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

/* ── Storage upload ───────────────────────────────────────────── */

async function uploadHero(
  sb: ReturnType<typeof createClient>,
  base64Data: string,
  outfitId: string
): Promise<string | null> {
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));
  const version = Date.now();
  const fileName = `outfit-heroes/${outfitId}-${version}.png`;

  const { error } = await sb.storage
    .from("backgrounds-curated")
    .upload(fileName, bytes, { contentType: "image/png", upsert: false });

  if (error) {
    console.error("Storage upload error:", error);
    return null;
  }

  return sb.storage.from("backgrounds-curated").getPublicUrl(fileName).data.publicUrl;
}

/* ── Process single outfit ────────────────────────────────────── */

async function processOutfit(
  sb: ReturnType<typeof createClient>,
  outfitId: string,
  apiKey: string,
  bgStyle?: string,
  regenerate = false,
  poseIndex?: number
): Promise<{ success: boolean; outfit_id: string; hero_url?: string; error?: string; skipped?: boolean }> {
  const { data: outfit, error: oErr } = await sb
    .from("weekly_outfits")
    .select("id, occasion, title, hero_image_url, gender")
    .eq("id", outfitId)
    .single();

  if (oErr || !outfit) {
    return { success: false, outfit_id: outfitId, error: "Outfit not found" };
  }

  if (outfit.hero_image_url && !regenerate) {
    return { success: true, outfit_id: outfitId, hero_url: outfit.hero_image_url, skipped: true };
  }

  const { data: items } = await sb
    .from("weekly_outfit_items")
    .select("product_name, brand, category, image_url")
    .eq("outfit_id", outfitId)
    .order("position", { ascending: true });

  if (!items || items.length === 0) {
    return { success: false, outfit_id: outfitId, error: "No items in outfit" };
  }

  console.log(`Generating hero for outfit "${outfit.title}" (${items.length} items, gender: ${outfit.gender || "unisex"})`);

  const prompt = buildPrompt(items, outfit.occasion, outfit.gender, bgStyle, poseIndex);
  const base64 = await generateHeroImage(prompt, apiKey);

  if (!base64) {
    return { success: false, outfit_id: outfitId, error: "Image generation failed" };
  }

  const publicUrl = await uploadHero(sb, base64, outfitId);
  if (!publicUrl) {
    return { success: false, outfit_id: outfitId, error: "Upload failed" };
  }

  const { error: updateErr } = await sb
    .from("weekly_outfits")
    .update({ hero_image_url: publicUrl })
    .eq("id", outfitId);

  if (updateErr) {
    return { success: false, outfit_id: outfitId, error: updateErr.message };
  }

  return { success: true, outfit_id: outfitId, hero_url: publicUrl };
}

/* ── HTTP handler ─────────────────────────────────────────────── */

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
    for (let idx = 0; idx < outfits.length; idx++) {
      const o = outfits[idx];
      try {
        const result = await processOutfit(sb, o.id, apiKey, body.background_style, body.regenerate, idx);
        results.push(result);
        if (results.length < outfits.length) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (e) {
        results.push({ success: false, outfit_id: o.id, error: e instanceof Error ? e.message : "Unknown" });
        if (e instanceof Error && e.message === "RATE_LIMITED") {
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
