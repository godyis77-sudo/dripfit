import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { VirtualTryonSchema, parseOrError, successResponse, errorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.json();
    const parsed = parseOrError(VirtualTryonSchema, raw);
    if (!parsed.success) {
      return errorResponse(parsed.error, "VALIDATION_ERROR", 400, corsHeaders);
    }
    const { userPhoto, clothingPhoto } = parsed.data;
    const itemType: string = raw.itemType || "clothing";
    const ACCESSORY_TYPES = ["accessory", "jewelry", "necklace", "bracelet", "earrings", "ring", "watch", "hat", "hats", "cap", "sunglasses", "glasses", "bag", "bags", "purse", "handbag", "belt", "belts", "scarf", "scarves", "shoes", "sneakers", "boots", "heels", "loafers", "sandals"];
    const isAccessory = ACCESSORY_TYPES.includes(itemType.toLowerCase());
    const isLayering = raw.isLayering === true;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("LOVABLE_API_KEY is not configured", "CONFIG_ERROR", 500, corsHeaders);

    // Convert a URL or base64 string into a data URI, falling back to raw URL
    const toImageInput = async (input: string): Promise<string> => {
      if (input.startsWith("data:")) return input;
      if (input.startsWith("http://") || input.startsWith("https://")) {
        // Try to fetch & convert; if CDN rejects, pass the raw URL
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(input, { 
              signal: controller.signal,
              headers: { 
                'User-Agent': 'Mozilla/5.0 (compatible; DripCheck/1.0)',
                'Accept': 'image/*',
              },
            });
            clearTimeout(timeout);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            if (buf.byteLength < 100) throw new Error("Image too small, likely invalid");
            const contentType = res.headers.get("content-type") || "image/jpeg";
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            return `data:${contentType};base64,${btoa(binary)}`;
          } catch (e) {
            console.warn(`Fetch attempt ${attempt + 1} failed for ${input}: ${e}`);
            if (attempt === 2) {
              console.log("Falling back to raw URL for AI gateway");
              return input;
            }
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          }
        }
      }
      return `data:image/jpeg;base64,${input}`;
    };

    const makeImagePart = (input: string) => {
      return {
        type: "image_url" as const,
        image_url: { url: input },
      };
    };

    const [userImageInput, clothingImageInput] = await Promise.all([
      toImageInput(userPhoto),
      toImageInput(clothingPhoto),
    ]);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        modalities: ["text", "image"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: isAccessory || isLayering
                ? `You are a virtual try-on assistant. You MUST generate a new composite image.\n\nImage 1: A photo of a person${isLayering ? " already wearing an outfit" : ""}.\nImage 2: An accessory item (${itemType}).\n\nYour task: Generate a SINGLE photorealistic image showing the person from Image 1 wearing/using the ${itemType} from Image 2.\n\nMANDATORY RULES:\n1. The output MUST show the PERSON from Image 1 as the main subject — NOT just the accessory alone.\n2. Keep the person's face, body, skin tone, hair, pose, and background IDENTICAL.\n3. Keep all existing clothing/outfit UNCHANGED.\n4. Add ONLY the ${itemType} from Image 2, placed naturally on the person (correct scale, position, lighting, shadows).\n5. The final image must look like a real photograph.\n6. DO NOT output just the accessory on its own — the person MUST be visible in the output.\n\nGenerate the composite image now.`
                : `You are a virtual try-on assistant. You MUST generate a new composite image.\n\nImage 1: A photo of a person.\nImage 2: A clothing item.\n\nYour task: Generate a SINGLE photorealistic image showing the person from Image 1 wearing the clothing from Image 2.\n\nMANDATORY RULES:\n1. The output MUST show the PERSON from Image 1 as the main subject — NOT just the clothing alone.\n2. Keep the person's face, body, skin tone, hair, pose, and background IDENTICAL.\n3. The clothing must fit naturally with realistic draping, folds, and shadows.\n4. The final image must look like a real photograph.\n5. DO NOT output just the clothing item on its own — the person MUST be visible in the output.\n\nGenerate the composite image now.` },
              makeImagePart(userImageInput),
              makeImagePart(clothingImageInput),
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse("Rate limited. Please try again in a moment.", "RATE_LIMITED", 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse("AI credits exhausted. Please add credits.", "PAYMENT_REQUIRED", 402, corsHeaders);
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return errorResponse(`AI gateway returned ${response.status}`, "AI_ERROR", 502, corsHeaders);
    }

    const aiResponse = await response.json();
    const message = aiResponse.choices?.[0]?.message;
    let resultImage: string | null = null;

    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const img = message.images[0];
      if (img?.image_url?.url) {
        resultImage = img.image_url.url;
      }
    }

    if (!resultImage) {
      const textContent = typeof message?.content === "string" ? message.content : "";
      return successResponse({ 
        description: textContent || "The AI was unable to generate a try-on image. Try with clearer photos.",
        resultImage: null 
      }, 200, corsHeaders);
    }

    return successResponse({ resultImage }, 200, corsHeaders);
  } catch (e) {
    console.error("virtual-tryon error:", e);
    return errorResponse(e instanceof Error ? e.message : "Try-on failed", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
