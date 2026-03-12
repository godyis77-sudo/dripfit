import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { VirtualTryonSchema, parseOrError, successResponse, errorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let raw: Record<string, unknown>;
    try {
      raw = await req.json();
    } catch {
      return errorResponse("Request body is empty or malformed. Photos may be too large — try smaller images.", "VALIDATION_ERROR", 400, corsHeaders);
    }

    // Validate required fields
    const { userPhoto, clothingPhoto } = raw;
    if (!userPhoto || typeof userPhoto !== 'string' || userPhoto.length > 5_000_000) {
      return errorResponse('Invalid user photo', 'VALIDATION_ERROR', 400, corsHeaders);
    }
    if (!clothingPhoto || typeof clothingPhoto !== 'string' || clothingPhoto.length > 5_000_000) {
      return errorResponse('Invalid clothing photo', 'VALIDATION_ERROR', 400, corsHeaders);
    }

    // JWT verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 'AUTH_ERROR', 401, corsHeaders);
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse('Unauthorized', 'AUTH_ERROR', 401, corsHeaders);
    }

    const parsed = parseOrError(VirtualTryonSchema, raw);
    if (!parsed.success) {
      return errorResponse(parsed.error, "VALIDATION_ERROR", 400, corsHeaders);
    }
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
                ? `VIRTUAL TRY-ON TASK — READ CAREFULLY.\n\nYou will receive exactly TWO images in order:\n- FIRST IMAGE (Image 1): This is a PHOTO OF A PERSON${isLayering ? " already wearing an outfit" : ""}. This is the HUMAN SUBJECT.\n- SECOND IMAGE (Image 2): This is an ACCESSORY ITEM (${itemType}). This is the PRODUCT to add.\n\nYour task: Generate a SINGLE photorealistic image showing the PERSON from Image 1 wearing/using the ${itemType} from Image 2.\n\nCRITICAL RULES:\n1. The PERSON from Image 1 is the main subject. Keep their face, body, skin tone, hair, pose, and background IDENTICAL.\n2. REPLACE or ADD only the ${itemType} — take the design, color, pattern, and style from Image 2.\n3. Do NOT swap the person. Do NOT generate a different person. The output person must be the SAME person as Image 1.\n4. Do NOT output just the product alone — the PERSON must be the main subject.\n5. The final image must look like a natural photograph.\n\nGenerate the composite image now.`
                : `VIRTUAL TRY-ON TASK — READ CAREFULLY.\n\nYou will receive exactly TWO images in order:\n- FIRST IMAGE (Image 1): This is a PHOTO OF A PERSON. This is the HUMAN SUBJECT who will wear the clothing.\n- SECOND IMAGE (Image 2): This is a CLOTHING ITEM / GARMENT. This is the PRODUCT to dress the person in.\n\nYour task: Generate a SINGLE photorealistic image showing the PERSON from Image 1 wearing the CLOTHING from Image 2.\n\nCRITICAL RULES:\n1. The PERSON from Image 1 is the main subject. Keep their face, body, skin tone, hair, pose, and background IDENTICAL.\n2. REPLACE the person's current top/outfit with the garment from Image 2. Match the exact color, pattern, design, and style of the clothing in Image 2.\n3. Do NOT swap the person. Do NOT use the person from Image 2 (if any). The output person must be the SAME person as Image 1.\n4. Do NOT output just the clothing item alone — the PERSON must be the main subject wearing the new garment.\n5. The clothing must fit naturally with realistic draping, folds, and shadows.\n6. The final image must look like a natural photograph.\n\nGenerate the composite image now.` },
              { type: "text", text: "IMAGE 1 — THE PERSON (human subject):" },
              makeImagePart(userImageInput),
              { type: "text", text: "IMAGE 2 — THE CLOTHING/PRODUCT (garment to dress the person in):" },
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
