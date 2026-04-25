import { getCorsHeaders } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Generate AI backgrounds using Lovable AI image generation.
 *
 * POST body:
 *   category: string (slug) — which category to generate for
 *   prompt_index?: number   — which prompt to use (0-3), default 0
 *   replace?: boolean       — delete existing AI backgrounds for this category first
 *
 * Generates ONE image per call for fast responses.
 * Call repeatedly with different prompt_index values to populate a category.
 */

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

const CATEGORY_PROMPTS: Record<string, { prompts: string[]; premium: boolean[] }> = {
  "street-urban": {
    prompts: [
      "A stunning empty city street at golden hour, warm sunlight casting long shadows between modern buildings, cinematic vertical composition, no people, beautiful urban photography",
      "A vibrant alleyway with colorful graffiti murals, wet cobblestones reflecting neon signs, night time, moody cinematic atmosphere, no people, portrait orientation",
      "An elegant Parisian boulevard lined with trees and cafe umbrellas, soft afternoon light, empty sidewalk, beautiful perspective, no people",
      "A dramatic urban bridge at blue hour with city lights reflecting on water below, vertical composition, no people, cinematic mood",
    ],
    premium: [false, false, true, true],
  },
  "studio-minimal": {
    prompts: [
      "A clean white photography studio cyclorama with soft diffused lighting, professional studio setup, minimalist backdrop, empty, pristine",
      "A warm beige textured concrete wall backdrop with soft side lighting and subtle shadows, minimalist studio setting, empty",
      "A soft pastel gradient background transitioning from blush pink to lavender, smooth dreamy studio lighting, empty",
      "A dramatic dark charcoal studio backdrop with a single spotlight creating a moody pool of light on the floor, empty",
    ],
    premium: [false, false, false, true],
  },
  "nature-outdoor": {
    prompts: [
      "A magical forest path with golden sunlight streaming through tall trees, scattered wildflowers, peaceful atmosphere, no people, vertical composition",
      "A breathtaking field of lavender stretching to distant mountains at sunset, warm purple and gold tones, no people, portrait orientation",
      "A serene tropical beach with turquoise water and white sand, palm trees swaying, golden hour, no people, stunning vertical composition",
      "A misty mountain trail with dramatic cloud formations and lush greenery, ethereal light, no people, vertical format",
    ],
    premium: [false, false, true, true],
  },
  "architecture": {
    prompts: [
      "Grand marble columns and ornate archways of a classical building, symmetrical composition, warm light, no people, vertical format",
      "A stunning modern glass skyscraper reflecting sunset clouds, dramatic vertical perspective looking up, no people",
      "An elegant spiral staircase with ornate iron railings, marble steps, overhead view, beautiful light, no people",
      "A majestic cathedral interior with stained glass windows casting colorful light patterns on stone floor, empty, vertical",
    ],
    premium: [false, false, true, true],
  },
  "luxury-interior": {
    prompts: [
      "An opulent hotel lobby with marble floors, golden chandeliers, and plush velvet furniture, warm elegant lighting, empty, no people",
      "A stunning art gallery with white walls and polished concrete floors, dramatic spotlighting, spacious empty room, minimalist",
      "A luxurious penthouse living room with floor-to-ceiling windows overlooking a city skyline at sunset, empty, elegant",
      "An elegant ballroom with crystal chandeliers, gilded mirrors, and parquet floors, warm golden light, empty, regal",
    ],
    premium: [false, false, true, true],
  },
  "nightlife-neon": {
    prompts: [
      "A cyberpunk alleyway glowing with neon purple and pink lights, wet reflective surfaces, dramatic atmosphere, no people, vertical",
      "A stunning corridor lit with LED strips in blue and magenta, futuristic aesthetic, reflective floor, no people, moody",
      "A rainy night city street with neon signs reflecting in puddles, cinematic atmosphere, vibrant colors, no people, portrait",
      "A retro arcade interior with rows of glowing machines casting colorful light, empty, nostalgic neon atmosphere",
    ],
    premium: [false, false, true, true],
  },
  "spring-summer": {
    prompts: [
      "A gorgeous cherry blossom tree-lined pathway in full bloom, soft pink petals falling, warm spring sunlight, no people, vertical",
      "A stunning tropical garden with exotic flowers and a stone pathway, warm afternoon light filtering through palms, no people",
      "An idyllic Mediterranean terrace overlooking a turquoise sea, bougainvillea flowers, warm golden light, no people, vertical",
      "A beautiful sunflower field at golden hour with a clear blue sky, vibrant yellows and greens, no people, portrait orientation",
    ],
    premium: [false, false, true, false],
  },
  "fall-winter": {
    prompts: [
      "A stunning autumn forest path covered in golden and red fallen leaves, warm sunlight filtering through trees, no people, vertical",
      "A magical winter wonderland with snow-covered evergreen trees, soft blue light, pristine white landscape, no people, portrait",
      "A cozy autumn street with warm streetlamps and fallen leaves, misty atmosphere, golden tones, no people, cinematic",
      "A dramatic frozen lake surrounded by snow-capped mountains under a clear blue sky, no people, stunning vertical composition",
    ],
    premium: [false, false, false, true],
  },
  "travel-iconic": {
    prompts: [
      "The Eiffel Tower at sunset with a gorgeous pink and gold sky, seen from Trocadero gardens, no people, vertical composition",
      "A stunning view of Santorini's blue-domed churches overlooking the Aegean Sea at golden hour, no people, portrait",
      "Tokyo's neon-lit Shibuya crossing at night, wet streets reflecting colorful signs, empty of people, cinematic vertical",
      "New York City skyline from a rooftop at blue hour, dramatic clouds, city lights starting to glow, no people, vertical",
    ],
    premium: [false, true, true, true],
  },
  "sports-active": {
    prompts: [
      "A beautiful empty basketball court at sunset with dramatic golden light and long shadows, outdoor urban setting, no people, vertical",
      "A pristine running track in a modern stadium, dramatic overhead lighting, empty lanes, no people, vertical composition",
      "An aesthetic concrete skatepark with dramatic late afternoon shadows, empty, urban design, no people, golden light",
      "A gorgeous empty tennis court with a dramatic sky at dusk, professional surface, no people, vertical composition",
    ],
    premium: [false, false, false, true],
  },
  "abstract-artistic": {
    prompts: [
      "A stunning abstract mural wall with vibrant flowing colors in blues, purples and golds, artistic texture, beautiful lighting",
      "A gorgeous iridescent holographic surface with rainbow reflections, smooth gradients, dreamy abstract background",
      "A luxurious white marble wall with dramatic gold veining, dramatic side lighting casting shadows, elegant texture",
      "A beautiful paint-splattered concrete wall with drips of vibrant color, artistic urban backdrop, dramatic lighting",
    ],
    premium: [false, false, true, true],
  },
  "beach-tropical": {
    prompts: [
      "A pristine tropical beach with turquoise crystal-clear water, powdery white sand, and a lone palm tree leaning over the shore at golden hour, no people, vertical composition",
      "A luxury marina at sunset with sleek white yachts moored against a soft pink and gold sky, calm water reflections, wooden dock in foreground, no people, portrait orientation",
      "A dramatic overwater bungalow view in the Maldives with turquoise lagoon, thatched roofs, and a wooden walkway leading into the water, golden afternoon light, no people, vertical",
      "A secluded Caribbean cove with dramatic limestone cliffs, emerald water, and lush tropical foliage framing the shoreline, warm sunset glow, no people, portrait orientation",
    ],
    premium: [false, false, true, true],
  },
  "wilderness-forest": {
    prompts: [
      "A lush old-growth forest trail with towering redwoods, soft morning mist, shafts of golden sunlight piercing through the canopy, moss-covered floor, no people, vertical composition",
      "A dramatic pine forest path in autumn with rich golden and copper leaves carpeting the ground, soft backlight through trees, serene atmosphere, no people, portrait orientation",
      "A mystical fern-covered forest clearing with a moss-draped fallen log, ethereal light filtering through dense canopy, cinematic depth, no people, vertical",
      "A rugged wilderness hiking trail winding through towering evergreens with distant mountain peaks visible, dramatic late afternoon light, no people, portrait orientation",
    ],
    premium: [false, false, true, true],
  },
  "mountains-lakes": {
    prompts: [
      "A breathtaking alpine lake with perfectly still mirror-like water reflecting snow-capped peaks, pine trees along the shore, crisp morning light, no people, vertical composition",
      "A dramatic mountain vista at golden hour with layered ridgelines fading into blue haze, warm light on the peaks, a lone rocky outcrop in foreground, no people, portrait orientation",
      "A turquoise glacial lake nestled between towering granite peaks, rocky shoreline with wildflowers, cinematic scale, dramatic afternoon light, no people, vertical",
      "A high-altitude mountain hiking pass with jagged snow-dusted peaks, a narrow rocky trail winding upward, dramatic clouds rolling over the ridge, golden late-day light, no people, portrait orientation",
    ],
    premium: [false, false, true, true],
  },
};

async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [
        {
          role: "user",
          content: `Generate a beautiful high-quality background image with portrait/vertical orientation (3:4 aspect ratio). No people, no text, no watermarks. ${prompt}`,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`AI gateway error ${res.status}:`, errText);
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
}

async function uploadToStorage(
  sb: ReturnType<typeof createClient>,
  base64Data: string,
  fileName: string
): Promise<string | null> {
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));

  const { error } = await sb.storage
    .from("backgrounds-curated")
    .upload(fileName, bytes, { contentType: "image/png", upsert: true });

  if (error) {
    console.error("Storage upload error:", error);
    return null;
  }

  return sb.storage.from("backgrounds-curated").getPublicUrl(fileName).data.publicUrl;
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

  let body: { category?: string; prompt_index?: number; replace?: boolean } = {};
  try { body = await req.json(); } catch { /* use defaults from query params */ }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const url = new URL(req.url);
  const category = body.category || url.searchParams.get("category");
  const promptIndex = body.prompt_index ?? parseInt(url.searchParams.get("prompt_index") || "0");
  const shouldReplace = body.replace ?? url.searchParams.get("replace") === "true";

  // List available categories
  if (!category) {
    return new Response(JSON.stringify({
      available_categories: Object.keys(CATEGORY_PROMPTS),
      usage: "POST with { category: 'slug', prompt_index: 0-3, replace?: true }",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const config = CATEGORY_PROMPTS[category];
  if (!config) {
    return new Response(JSON.stringify({ error: `Unknown category: ${category}`, available: Object.keys(CATEGORY_PROMPTS) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (promptIndex < 0 || promptIndex >= config.prompts.length) {
    return new Response(JSON.stringify({ error: `prompt_index must be 0-${config.prompts.length - 1}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get category ID
  const { data: cats } = await sb.from("background_categories").select("id, slug").eq("slug", category).single();
  if (!cats) {
    return new Response(JSON.stringify({ error: "Category not found in database" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Delete existing AI backgrounds for this category if replacing
  if (shouldReplace && promptIndex === 0) {
    await sb.from("backgrounds").delete().eq("source", "ai-generated").eq("category_id", cats.id);
  }

  const prompt = config.prompts[promptIndex];
  const isPremium = config.premium[promptIndex] ?? false;
  const fileName = `ai/${category}/${category}-${promptIndex + 1}.png`;
  const bgName = prompt.split(",")[0].replace(/^(A |An |The )/, "").slice(0, 60);

  console.log(`Generating: ${category}/${promptIndex + 1} — ${bgName}`);

  const base64 = await generateImage(prompt, apiKey);
  if (!base64) {
    return new Response(JSON.stringify({ error: "Image generation failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const publicUrl = await uploadToStorage(sb, base64, fileName);
  if (!publicUrl) {
    return new Response(JSON.stringify({ error: "Storage upload failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Upsert into backgrounds table
  const sourceId = `ai-${category}-${promptIndex + 1}`;

  // Delete existing with same source_id to avoid duplicates
  await sb.from("backgrounds").delete().eq("source_id", sourceId);

  const { error: insertErr } = await sb.from("backgrounds").insert({
    category_id: cats.id,
    name: bgName,
    storage_path: publicUrl,
    thumbnail_path: publicUrl,
    is_premium: isPremium,
    is_active: true,
    source: "ai-generated",
    source_id: sourceId,
    photographer: "AI Generated",
    tags: category.split("-"),
  });

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    category,
    prompt_index: promptIndex,
    name: bgName,
    url: publicUrl,
    is_premium: isPremium,
    next_prompt_index: promptIndex + 1 < config.prompts.length ? promptIndex + 1 : null,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
