import { getCorsHeaders } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Generate AI backgrounds for each category using Lovable AI image generation.
 * Replaces the Pexels-based seed-backgrounds function.
 *
 * Query params:
 *   ?replace=true   — delete existing AI-generated backgrounds first
 *   ?category=slug  — generate for a single category only
 *   ?count=N        — number of images per prompt (default 1, max 2)
 */

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

// Prompts per category: each yields a beautiful, portrait-oriented scene with no people
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
};

async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
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
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageUrl || null;
  } catch (e) {
    console.error("Image generation failed:", e);
    return null;
  }
}

async function uploadToStorage(
  sb: ReturnType<typeof createClient>,
  base64Data: string,
  fileName: string
): Promise<string | null> {
  try {
    // Strip data URI prefix
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));

    const { error } = await sb.storage
      .from("backgrounds-curated")
      .upload(fileName, bytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }

    const { data: urlData } = sb.storage
      .from("backgrounds-curated")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (e) {
    console.error("Upload failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const url = new URL(req.url);
  const shouldReplace = url.searchParams.get("replace") === "true";
  const targetCategory = url.searchParams.get("category");
  const countPerPrompt = Math.min(parseInt(url.searchParams.get("count") || "1"), 2);

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

  // Delete old AI-generated backgrounds if replacing
  if (shouldReplace) {
    const deleteQuery = sb.from("backgrounds").delete().eq("source", "ai-generated");
    if (targetCategory) {
      const catId = slugToId.get(targetCategory);
      if (catId) deleteQuery.eq("category_id", catId);
    }
    const { error: delErr } = await deleteQuery;
    if (delErr) console.error("Delete old AI backgrounds error:", delErr);
  }

  let generated = 0;
  let failed = 0;
  const results: { category: string; name: string; success: boolean }[] = [];

  const categoriesToProcess = targetCategory
    ? { [targetCategory]: CATEGORY_PROMPTS[targetCategory] }
    : CATEGORY_PROMPTS;

  for (const [slug, config] of Object.entries(categoriesToProcess)) {
    if (!config) continue;
    const catId = slugToId.get(slug);
    if (!catId) continue;

    for (let pi = 0; pi < config.prompts.length; pi++) {
      const prompt = config.prompts[pi];
      const isPremium = config.premium[pi] ?? false;

      for (let ci = 0; ci < countPerPrompt; ci++) {
        const suffix = countPerPrompt > 1 ? `-v${ci + 1}` : "";
        const fileName = `ai/${slug}/${slug}-${pi + 1}${suffix}.png`;
        const bgName = prompt
          .split(",")[0]
          .replace(/^(A |An |The )/, "")
          .slice(0, 60);

        console.log(`Generating: ${slug}/${pi + 1}${suffix} — ${bgName}`);

        const base64 = await generateImage(prompt, apiKey);
        if (!base64) {
          failed++;
          results.push({ category: slug, name: bgName, success: false });
          continue;
        }

        const publicUrl = await uploadToStorage(sb, base64, fileName);
        if (!publicUrl) {
          failed++;
          results.push({ category: slug, name: bgName, success: false });
          continue;
        }

        // Insert into backgrounds table
        const { error: insertErr } = await sb.from("backgrounds").insert({
          category_id: catId,
          name: bgName,
          storage_path: publicUrl,
          thumbnail_path: publicUrl,
          is_premium: isPremium,
          is_active: true,
          source: "ai-generated",
          source_id: `ai-${slug}-${pi + 1}${suffix}`,
          photographer: "AI Generated",
          tags: slug.split("-"),
        });

        if (insertErr) {
          console.error("Insert error:", insertErr);
          failed++;
          results.push({ category: slug, name: bgName, success: false });
        } else {
          generated++;
          results.push({ category: slug, name: bgName, success: true });
        }

        // Rate limit courtesy delay
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      generated,
      failed,
      replaced: shouldReplace,
      category: targetCategory || "all",
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
