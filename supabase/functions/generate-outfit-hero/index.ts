import { getCorsHeaders } from "../_shared/validation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

/**
 * generate-outfit-hero v3 — Campaign-referenced editorial image generation.
 * Uses waitUntil pattern to avoid edge function timeouts.
 *
 * POST body:
 *   outfit_id: string           — single outfit
 *   week_id?: string            — batch all outfits in a week
 *   regenerate?: boolean        — overwrite existing hero images
 *   heroes_only?: boolean       — only generate for is_hero=true outfits
 */

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

/* ══════════════════════════════════════════════════════════════════
   CAMPAIGN REFERENCES — Top fashion house editorial anchors
   ══════════════════════════════════════════════════════════════════ */

interface CampaignRef {
  reference: string;
  location: string;
  architecture: string;
  camera: string;
  lighting: string;
  colorGrade: string;
  negative: string;
  styling: string;
  footwearGuide: string;
}

const CAMPAIGNS: Record<string, CampaignRef> = {
  night_out: {
    reference: "Tom Ford Noir meets Bottega Veneta evening editorial",
    location: "Grand European hotel lobby entrance at night. Polished black marble floors reflecting warm amber light. Tall art deco doors with brass handles ajar. Rain-wet cobblestones visible through entrance.",
    architecture: "Art deco meets Milanese palazzo. Travertine columns, fluted pilasters, geometric brass inlays in the marble floor.",
    camera: "Shot on Leica M11 with Noctilux 50mm f/0.95 wide open. Medium-wide shot. Camera at hip height angled 5° upward for subtle power framing. Extremely shallow depth of field.",
    lighting: "Warm practical chandelier as key light from above-right (3200K amber). Cool blue-grey fill from rain-wet exterior (6500K). Strong rim light from behind-left catching shoulder and hair edge.",
    colorGrade: "Rich amber-gold highlights, deep espresso shadows. Lifted blacks to 8%. Skin tones warm and luminous. Background 10% teal shift. 35mm film grain at 12%. Overall: Tom Ford Noir meets Wong Kar-Wai.",
    negative: "No neon. No club lighting. No harsh flash. No visible logos overlaid. No selfie angle. No smiling at camera. No casual posture.",
    styling: "Intentional nightlife layering — open jacket over a statement piece, accessories catching warm light. Confident, unhurried energy.",
    footwearGuide: "sleek pointed-toe boots or premium low-profile sneakers with polished finish",
  },
  beach_day: {
    reference: "Jacquemus La Riviera meets Loro Piana Summer Walk",
    location: "Whitewashed Mediterranean terrace overlooking turquoise sea at golden hour. Bougainvillea cascading over weathered stone walls. Warm honeyed sunlight.",
    architecture: "Greek island minimalism. Rough lime-washed walls, hand-cut limestone steps, terracotta accents. Natural materials only.",
    camera: "Shot on Hasselblad X2D with XCD 65mm f/2.8. Full-body environmental portrait. Camera at eye level, slight upward tilt. Subject fills 60% of frame with sea horizon visible.",
    lighting: "Golden hour sun as key from camera-right (3800K warm). Bounced fill from white walls. Soft rim light from behind catching fabric texture and hair.",
    colorGrade: "Sun-bleached warmth. Highlights pushed to cream-gold. Shadows in soft terracotta. Lifted midtones. Grain at 8%. Overall: Slim Aarons meets Jacquemus campaign.",
    negative: "No harsh midday sun. No sunglasses on head. No pool party energy. No cluttered background. No printed towels or umbrellas.",
    styling: "Relaxed luxury resort — effortless drape, rolled sleeves or untucked layers, premium casual silhouette. Everything looks lived-in but expensive.",
    footwearGuide: "premium slides, espadrilles, or clean low-cut canvas shoes — never heavy boots",
  },
  lunch_date: {
    reference: "The Row SS26 meets COS Atelier editorial",
    location: "Upscale Parisian sidewalk café. Dappled afternoon sunlight filtering through plane trees. Marble-top bistro table with espresso. Haussmann building facade behind.",
    architecture: "Classic Parisian. Wrought-iron balconies, cream limestone facade, dark green café awning. Zinc countertop visible inside. Newspapers on the table.",
    camera: "Shot on Fujifilm GFX100S with GF 80mm f/1.7. Medium shot with environmental context. Subject at slight 3/4 angle. Shallow DOF with beautiful bokeh on café interior.",
    lighting: "Dappled natural sunlight through tree canopy as key (5500K). Soft bounced fill from cream building facade. Hair light from sun patches.",
    colorGrade: "Warm neutral palette. Champagne highlights, soft sage shadows. Skin luminous and natural. Subtle film emulation — Portra 400. Grain at 6%.",
    negative: "No harsh shadows. No tourist crowd. No bright colors. No fast-food setting. No over-styled hair. No over-accessorized.",
    styling: "Polished elevated casual — clean proportions, thoughtful layering, mixing textures like knit over cotton. Effortless but intentional.",
    footwearGuide: "clean minimalist leather loafers, ballet flats, or designer sneakers",
  },
  weekend_casual: {
    reference: "Fear of God Essentials meets Aritzia Super World",
    location: "Sun-drenched modernist concrete terrace overlooking a coastal city at late afternoon. Clean architectural lines. Warm golden light.",
    architecture: "Brutalist-meets-California modern. Poured concrete, floor-to-ceiling glass, steel railings. Succulent garden in background.",
    camera: "Shot on Sony A7RV with 35mm f/1.4 GM. Medium-wide environmental shot. Camera at natural eye level. Subject walking through frame with urban backdrop.",
    lighting: "Low afternoon sun as strong key from camera-left (4200K warm). Soft fill bounced from concrete surfaces. Strong backlight creating clothing edge definition.",
    colorGrade: "Warm concrete tones. Highlights in soft gold. Shadows in cool grey-blue. Lifted blacks. Clean and modern. Grain at 5%. Overall: Aritzia campaign meets architectural photography.",
    negative: "No gym clothes. No loungewear energy. No bedroom. No couch. No messy background. No logo-heavy styling.",
    styling: "Premium streetwear layering — oversized over fitted, brand-mixing done intentionally, sneakers styled up. Everything looks casual but costs serious money.",
    footwearGuide: "fresh designer sneakers, lifestyle runners, or premium mules",
  },
  office: {
    reference: "Prada FW26 meets Hugo Boss Modern Tailoring",
    location: "Sleek glass-walled corner office with panoramic city skyline view at dusk. Soft directional window light. Minimal furniture — a Mies van der Rohe chair, single orchid.",
    architecture: "International style corporate. Floor-to-ceiling curtain wall glass, polished concrete floor, brass drawer handles. Power architecture.",
    camera: "Shot on Phase One XF IQ4 with Schneider 80mm f/2.8. Full-body power portrait. Camera at waist height angled upward 3° for authority framing. Tack sharp subject, city bokeh behind.",
    lighting: "Large window as soft key light from camera-right (5000K neutral). Warm desk lamp as accent from below-left (2800K). Subtle rim light from secondary window behind.",
    colorGrade: "Cool power palette. Steel-blue highlights, warm shadows. High contrast. Skin tones neutral and refined. Minimal grain. Overall: Prada campaign meets architectural digest.",
    negative: "No fluorescent lighting. No cubicle. No casual Friday. No wrinkled clothing. No backpack. No messy desk.",
    styling: "Power-casual editorial — tailored pieces mixed with one streetwear element, confident silhouette. Looks like a CEO who skateboards.",
    footwearGuide: "monk-strap shoes, leather chelsea boots, or clean minimal sneakers",
  },
  festival: {
    reference: "Balenciaga SS26 meets Palace Skateboards editorial",
    location: "Vibrant desert festival at dusk. Warm stage glow mixed with purple-orange sunset. Dust particles catching golden backlight. Art installations visible in background.",
    architecture: "Festival industrial. Steel stage scaffolding, LED light rigs, fabric canopy structures. Burning Man meets Coachella VIP.",
    camera: "Shot on Canon R5 with RF 50mm f/1.2. Dynamic action shot. Camera low and wide. Subject mid-stride with festival energy. Dramatic lens flare from sunset.",
    lighting: "Sunset rim light from behind (3200K amber-pink). Cool LED fill from stage left (4500K cyan). Dust particles in backlight creating atmosphere.",
    colorGrade: "Saturated warm palette. Orange-magenta highlights, deep purple shadows. Boosted contrast. Skin warm and glowing. Film grain at 15%. Overall: Balenciaga meets Burning Man editorial.",
    negative: "No corporate fashion. No clean background. No studio lighting. No formal posture. No pristine clothing. No overhead noon sun.",
    styling: "Statement streetwear maximalism — bold layering, mixed textures, festival-ready but high-fashion. Clothes that make people stop and ask 'what are you wearing?'",
    footwearGuide: "chunky platform boots, bold designer sneakers, or statement sandals",
  },
  brunch: {
    reference: "Totême Spring meets Aesop store aesthetic",
    location: "Sunlit greenhouse café with lush tropical plants. Soft diffused morning light through glass ceiling. Brass plant stands, terrazzo floor, marble counter visible.",
    architecture: "Scandinavian greenhouse. Steel-frame glass structure, whitewashed brick base, hanging ferns, fiddle-leaf figs. Clean organic luxury.",
    camera: "Shot on Nikon Z9 with 58mm f/0.95 Noct. Environmental portrait in natural setting. Camera at eye level. Subject relaxed with plant foliage framing. Creamy bokeh.",
    lighting: "Diffused greenhouse sunlight as key (5500K soft). Green-filtered fill from plants. Warm accent from brass fixtures. Overall: even, flattering, botanical.",
    colorGrade: "Soft botanical palette. Cream-green highlights, warm earth shadows. Lifted midtones. Skin luminous and dewy. Grain at 4%. Overall: Cereal Magazine meets Kinfolk.",
    negative: "No harsh light. No crowded restaurant. No food in frame. No over-saturated colors. No stark white background. No posed smile.",
    styling: "Effortless luxury casual — soft textures, relaxed fits, earthy or pastel palette. Looks like they woke up looking this good.",
    footwearGuide: "clean white sneakers, espadrilles, mules, or strappy sandals",
  },
  gym: {
    reference: "Nike × Jacquemus collab meets Arc'teryx System_A",
    location: "Premium private gym with floor-to-ceiling windows overlooking a city at dawn. Concrete walls, steel equipment, rubber flooring. Light streaming in.",
    architecture: "Athletic industrial. Exposed ductwork, polished concrete, steel cable machines. Clean and minimal — no clutter, no mirrors with fingerprints.",
    camera: "Shot on Sony A1 with 24mm f/1.4 GM. Dynamic wide shot. Camera low for power perspective. Subject mid-movement or post-workout stance. Sharp throughout.",
    lighting: "Dawn window light as key from camera-right (5800K cool-warm). Hard overhead gym light creating dramatic shadow (4000K). Rim light from secondary window.",
    colorGrade: "Clean athletic palette. Cool highlights, warm skin tones. High contrast. Desaturated background, saturated clothing. Minimal grain. Overall: Nike campaign meets architectural photography.",
    negative: "No sweaty mess. No dirty gym. No mirror selfie. No fluorescent green. No baggy everything. No headband. No towel around neck.",
    styling: "Technical athleisure — clean performance pieces styled as a cohesive look, not gym-random. Every piece is intentional.",
    footwearGuide: "performance running shoes or cross-training sneakers",
  },
  date_night: {
    reference: "Saint Laurent by Night meets The Row evening editorial",
    location: "Intimate high-end cocktail bar. Moody dramatic lighting with warm tungsten highlights. Dark velvet banquettes, smoked mirror wall, single candle on marble bar.",
    architecture: "Art deco speakeasy. Fluted glass panels, oxidized brass bar rail, dark walnut paneling, geometric floor tile. Intimate and luxurious.",
    camera: "Shot on Leica SL3 with Summilux 50mm f/1.4. Tight environmental portrait. Camera at chest height. Shallow DOF with bar interior melting into warm bokeh.",
    lighting: "Single candle as practical key (2700K warm amber). Cool mirror reflection as fill from behind. Overhead spot creating hair light and shoulder definition.",
    colorGrade: "Moody warm palette. Amber highlights, deep black shadows. Crushed blacks at 5%. Rich skin tones. Heavy grain at 18%. Overall: Wong Kar-Wai meets Tom Ford.",
    negative: "No bright lights. No sports bar. No beer. No casual dining. No loud colors. No group shot. No phone visible.",
    styling: "Sharp contemporary layering — structured outerwear over fitted pieces, monochromatic or tonal color story. Dressed to impress one person.",
    footwearGuide: "heeled boots, pointed-toe shoes, or elevated dress sneakers",
  },
  wedding: {
    reference: "Brunello Cucinelli meets Ralph Lauren Purple Label",
    location: "Elegant estate garden at golden hour. Soft romantic backlight through old-growth trees. Stone balustrade, manicured hedges, petal-strewn gravel path.",
    architecture: "English country estate. Cotswold stone, climbing roses, wrought-iron gates, weathered sundial. Timeless and romantic.",
    camera: "Shot on Hasselblad 907X with XCD 90mm f/2.5. Three-quarter portrait. Camera at eye level with gentle upward angle. Subject framed between garden elements. Gorgeous bokeh.",
    lighting: "Golden hour backlight (3500K amber). Soft reflector fill from below-right. Rim light catching fabric drape and hair wisps. Overall: romantic, warm, cinematic.",
    colorGrade: "Romantic warm palette. Golden highlights, soft rose shadows. Lifted midtones. Skin glowing and warm. Fine grain at 6%. Overall: Vogue Weddings meets Brunello Cucinelli.",
    negative: "No flash photography. No reception hall. No group photo. No corsage. No dated styling. No stiff posture.",
    styling: "Elevated formal with personality — tailored foundation with one unexpected luxury accent piece. Stands out without trying.",
    footwearGuide: "polished leather dress shoes, heeled sandals, or satin pumps",
  },
};

/* ── Gender model descriptions ────────────────────────────────── */

const GENDER_MODELS: Record<string, string> = {
  mens: "a fit male model in his mid-20s with contemporary hairstyle, subtle stubble, strong jawline, naturally confident expression — think Vogue Homme or GQ editorial",
  womens: "a stylish female model in her mid-20s with contemporary hairstyle, natural makeup, effortlessly chic expression — think Vogue or SSENSE editorial",
};

/* ── Pose pool ────────────────────────────────────────────────── */

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

/* ── Color extraction ─────────────────────────────────────────── */

function extractColorHints(items: OutfitItem[]): string {
  const names = items.map(i => `${i.product_name} ${i.brand || ""}`).join(" ").toLowerCase();
  const colorKeywords = [
    "black", "white", "cream", "ivory", "navy", "blue", "indigo",
    "red", "burgundy", "maroon", "green", "olive", "sage", "khaki",
    "grey", "gray", "charcoal", "beige", "tan", "camel",
    "brown", "chocolate", "pink", "blush", "coral",
    "orange", "rust", "yellow", "gold", "purple", "lavender",
  ];
  const found = [...new Set(colorKeywords.filter(c => names.includes(c)))];
  if (found.length === 0) return "";
  return `\nDOMINANT COLOR PALETTE: ${found.join(", ")}. Ensure the outfit reflects these exact tones cohesively.`;
}

/* ── Types ─────────────────────────────────────────────────────── */

interface OutfitItem {
  product_name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  price_cents: number | null;
}

/* ── v3 Prompt builder — 8-layer editorial system ─────────────── */

function buildPrompt(
  items: OutfitItem[],
  occasion: string,
  gender: string | null,
  poseIndex?: number
): { text: string; imageUrls: string[] } {
  const campaign = CAMPAIGNS[occasion] || CAMPAIGNS.weekend_casual;
  const genderKey = gender === "womens" ? "womens" : "mens";
  const modelDesc = GENDER_MODELS[genderKey];
  const pose = POSE_POOL[(poseIndex ?? Math.floor(Math.random() * POSE_POOL.length)) % POSE_POOL.length];

  const brands = [...new Set(items.map(i => i.brand).filter(Boolean))];
  const brandContext = brands.length > 0
    ? `This is a curated ${brands.join(" × ")} look.`
    : "This is a curated multi-brand look.";

  // Detect footwear in items
  const hasFootwear = items.some(i => {
    const c = `${i.category || ""} ${i.product_name || ""}`.toLowerCase();
    return /shoe|sneaker|boot|slipper|sandal|loafer|heel|pump|mule|flat|espadrille/.test(c);
  });

  // Build wardrobe layer with layering context
  const ROLE_ORDER = ["outerwear", "top", "bottom", "footwear", "accessory"];
  const wardrobeLines = items.map((item, i) => {
    const brand = item.brand ? ` by ${item.brand}` : "";
    const price = item.price_cents ? ` $${(item.price_cents / 100).toFixed(0)}` : "";
    const cat = item.category ? ` [${item.category}]` : "";
    return `  ${i + 1}. ${item.product_name}${brand}${price}${cat}`;
  }).join("\n");

  const colorHints = extractColorHints(items);

  const footwearInstruction = hasFootwear
    ? "The outfit includes specific footwear — the model MUST wear the exact shoes listed. Match design precisely from reference images."
    : `No footwear specified — style with ${campaign.footwearGuide} that complement the look.`;

  const imageUrls = items
    .map(i => i.image_url)
    .filter((url): url is string => !!url);

  const text = `You are a world-class fashion photographer shooting for ${campaign.reference}.

═══ LAYER 1: PRODUCT FIDELITY (ABSOLUTE PRIORITY) ═══
Reference product images are attached. The model MUST wear items VISUALLY IDENTICAL to those references:
- EXACT same colors, prints, graphics, logos, and text
- EXACT same silhouette, cut, and proportions
- Brand logos/text ON garments must match reference photos precisely
- Do NOT substitute, reinterpret, or create "inspired by" versions — COPY exactly

═══ LAYER 2: WARDROBE ═══
${brandContext}

OUTFIT PIECES (every item must be worn and recognizable):
${wardrobeLines}

STYLING: ${campaign.styling}
FOOTWEAR: ${footwearInstruction}
${colorHints}

═══ LAYER 3: MODEL ═══
${modelDesc}
POSE: ${pose}
Dynamic natural energy — NOT stiff or mannequin-like. ${genderKey === "womens" ? "Feminine silhouette, natural curves." : "Masculine build, clean lines."}

═══ LAYER 4: LOCATION + ARCHITECTURE ═══
${campaign.location}
${campaign.architecture}

═══ LAYER 5: CAMERA ═══
${campaign.camera}

═══ LAYER 6: LIGHTING ═══
${campaign.lighting}

═══ LAYER 7: COLOR GRADE ═══
${campaign.colorGrade}

═══ LAYER 8: NEGATIVE DIRECTION ═══
${campaign.negative}
No text overlays. No watermarks. No mannequins. No flat-lay. No product-only shots. Only styled on-body editorial.

═══ FINAL CHECK ═══
Full body shot, head to toe, portrait orientation (3:4 aspect ratio).
Verify each garment matches its reference image in color, pattern, graphic, and silhouette before generating.`;

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
  const sanitizedUrls = prompt.imageUrls.slice(0, 6).map(url => {
    try {
      const u = new URL(url);
      u.pathname = u.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
      return u.toString();
    } catch {
      return url;
    }
  });

  const accessChecks = await Promise.all(
    sanitizedUrls.map(async (url) => ({ url, ok: await checkImageAccessible(url) }))
  );
  const accessibleUrls = accessChecks.filter(c => c.ok).map(c => c.url);
  console.log(`Image accessibility: ${accessibleUrls.length}/${prompt.imageUrls.length} accessible`);

  for (const useImages of [true, false]) {
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: prompt.text },
    ];
    if (useImages && accessibleUrls.length > 0) {
      for (const url of accessibleUrls) {
        content.push({ type: "image_url", image_url: { url } });
      }
    } else if (useImages) {
      continue;
    }

    if (!useImages) {
      console.log("Retrying without image URLs (text-only prompt)");
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
      if (res.status === 400 && useImages) {
        console.log("Got 400 with images, will retry text-only...");
        continue;
      }
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  }

  return null;
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
    .select("product_name, brand, category, image_url, price_cents")
    .eq("outfit_id", outfitId)
    .order("position", { ascending: true });

  if (!items || items.length === 0) {
    return { success: false, outfit_id: outfitId, error: "No items in outfit" };
  }

  console.log(`Generating v3 hero for "${outfit.title}" (${items.length} items, ${outfit.gender || "unisex"}, occasion: ${outfit.occasion})`);

  const prompt = buildPrompt(items, outfit.occasion, outfit.gender, poseIndex);
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

/* ── Background processing for batch jobs ─────────────────────── */

async function processBatchInBackground(
  outfitIds: string[],
  apiKey: string,
  regenerate: boolean
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  for (let idx = 0; idx < outfitIds.length; idx++) {
    const outfitId = outfitIds[idx];
    try {
      const result = await processOutfit(sb, outfitId, apiKey, regenerate, idx);
      console.log(`[${idx + 1}/${outfitIds.length}] ${result.success ? "✅" : "❌"} ${outfitId}: ${result.hero_url || result.error || "skipped"}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown";
      console.error(`[${idx + 1}/${outfitIds.length}] ❌ ${outfitId}: ${msg}`);
      if (msg === "RATE_LIMITED") {
        console.log("Rate limited, waiting 60s...");
        await new Promise(r => setTimeout(r, 60000));
        // Retry this one
        try {
          await processOutfit(sb, outfitId, apiKey, regenerate, idx);
        } catch (e2) {
          console.error(`Retry failed for ${outfitId}: ${e2 instanceof Error ? e2.message : "Unknown"}`);
        }
      }
    }
    // Wait between generations to avoid rate limits
    if (idx < outfitIds.length - 1) {
      await new Promise(r => setTimeout(r, 15000));
    }
  }
  console.log(`[Background] Batch complete: ${outfitIds.length} outfits processed`);
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

  let body: { outfit_id?: string; week_id?: string; regenerate?: boolean; heroes_only?: boolean } = {};
  try { body = await req.json(); } catch { /* defaults */ }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  // Single outfit — process in background to avoid timeout
  if (body.outfit_id) {
    const outfitId = body.outfit_id;
    const regen = body.regenerate ?? false;

    const bgTask = async () => {
      const bgSb = createClient(supabaseUrl, supabaseKey);
      try {
        const result = await processOutfit(bgSb, outfitId, apiKey, regen);
        console.log(`[Single] ${result.success ? "✅" : "❌"} ${outfitId}: ${result.hero_url || result.error}`);
      } catch (e) {
        console.error(`[Single] ❌ ${outfitId}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    };

    // @ts-ignore: EdgeRuntime.waitUntil
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(bgTask());
    } else {
      bgTask();
    }

    return new Response(JSON.stringify({
      status: "processing",
      message: `Started generating hero for outfit ${outfitId} in background`,
      outfit_id: outfitId,
    }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Batch by week — use waitUntil to process in background
  if (body.week_id) {
    let query = sb
      .from("weekly_outfits")
      .select("id")
      .eq("week_id", body.week_id)
      .eq("is_active", true);

    if (body.heroes_only) {
      query = query.eq("is_hero", true);
    }

    const { data: outfits } = await query;

    if (!outfits || outfits.length === 0) {
      return new Response(JSON.stringify({ error: "No outfits found", week_id: body.week_id }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outfitIds = outfits.map(o => o.id);

    // Fire and forget — process in background
    // @ts-ignore: EdgeRuntime.waitUntil is available in Supabase edge runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processBatchInBackground(outfitIds, apiKey, body.regenerate ?? false));
    } else {
      // Fallback: just start the promise (it'll run until the runtime kills it)
      processBatchInBackground(outfitIds, apiKey, body.regenerate ?? false);
    }

    // Return immediately with 202
    return new Response(JSON.stringify({
      status: "processing",
      message: `Started generating heroes for ${outfitIds.length} outfits in background`,
      week_id: body.week_id,
      outfit_count: outfitIds.length,
    }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    version: "v3-editorial-async",
    usage: "POST with { outfit_id: 'uuid' } or { week_id: '2026-W15' }",
    options: { regenerate: true, heroes_only: true },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
