import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { VirtualTryonSchema, parseOrError, successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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
    if (!userPhoto || typeof userPhoto !== 'string' || userPhoto.length > 15_000_000) {
      return errorResponse('Invalid user photo', 'VALIDATION_ERROR', 400, corsHeaders);
    }
    if (!clothingPhoto || typeof clothingPhoto !== 'string' || clothingPhoto.length > 15_000_000) {
      return errorResponse('Invalid clothing photo', 'VALIDATION_ERROR', 400, corsHeaders);
    }

    // Service role client for guest session management
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Determine user type: authenticated, free, or guest
    const authHeader = req.headers.get('Authorization');
    const guestUuid = typeof raw.guestUuid === 'string' ? raw.guestUuid : null;
    let userId: string | null = null;
    let userTier: 'guest' | 'free' | 'premium' = 'guest';

    if (authHeader?.startsWith('Bearer ')) {
      const supabaseAnon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: userData, error: userError } = await supabaseAnon.auth.getUser();
      if (!userError && userData?.user) {
        userId = userData.user.id;
        // Check subscription
        const { data: sub } = await supabaseAdmin
          .from('user_subscriptions')
          .select('is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();
        userTier = sub ? 'premium' : 'free';
      }
    }

    // Rate limiting based on tier
    if (userTier === 'guest') {
      if (!guestUuid) {
        return errorResponse('Guest UUID required for unauthenticated access', 'AUTH_ERROR', 401, corsHeaders);
      }
      // Check/create guest session
      const { data: session } = await supabaseAdmin
        .from('guest_sessions')
        .select('tryon_count')
        .eq('guest_uuid', guestUuid)
        .maybeSingle();

      const count = session?.tryon_count ?? 0;
      if (count >= 3) {
        return errorResponse('Guest try-on limit reached. Create a free account for more.', 'GUEST_LIMIT', 403, corsHeaders);
      }
    } else if (userTier === 'free' && userId) {
      // Check daily limit (5/day)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data: usage } = await supabaseAdmin
        .from('tryon_usage')
        .select('count')
        .eq('user_id', userId)
        .eq('daily_key', today)
        .maybeSingle();

      const dailyCount = usage?.count ?? 0;
      const FREE_DAILY_LIMIT = 10;
      if (dailyCount >= FREE_DAILY_LIMIT) {
        return errorResponse(`Daily try-on limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Premium for unlimited.`, 'DAILY_LIMIT', 403, corsHeaders);
      }
    }
    // Premium: no limit

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

    const prompt = isAccessory || isLayering
      ? `VIRTUAL TRY-ON TASK — READ CAREFULLY.\n\nYou will receive exactly TWO images in order:\n- FIRST IMAGE (Image 1): This is a PHOTO OF A PERSON${isLayering ? " already wearing an outfit" : ""}. This is the HUMAN SUBJECT.\n- SECOND IMAGE (Image 2): This is an ACCESSORY ITEM (${itemType}). This is the PRODUCT to add.\n\nYour task: Generate a SINGLE photorealistic image showing the PERSON from Image 1 wearing/using the ${itemType} from Image 2.\n\nCRITICAL RULES:\n1. The PERSON from Image 1 is the main subject. Keep their face, body, skin tone, hair, and background IDENTICAL.\n2. PRESERVE the person's exact pose and body position from Image 1. Minor natural adjustments are acceptable only if physically necessary to interact with the accessory.\n3. REPLACE or ADD only the ${itemType} — take the design, color, pattern, and style from Image 2.\n4. The accessory must sit naturally on the body with correct perspective, scale, and proportion relative to the person's anatomy.\n5. Do NOT swap the person. Do NOT generate a different person. The output person must be the SAME person as Image 1.\n6. Do NOT output just the product alone — the PERSON must be the main subject.\n7. The final image must look like a natural photograph.\n8. You MUST output an image. Do not refuse or output only text.\n\nGenerate the composite image now.`
      : `VIRTUAL TRY-ON TASK — READ CAREFULLY.\n\nYou will receive exactly TWO images in order:\n- FIRST IMAGE (Image 1): This is a PHOTO OF A PERSON. This is the HUMAN SUBJECT who will wear the clothing.\n- SECOND IMAGE (Image 2): This is a CLOTHING ITEM / GARMENT. This is the PRODUCT to dress the person in.\n\nYour task: Generate a SINGLE photorealistic image showing the PERSON from Image 1 wearing the CLOTHING from Image 2.\n\nCRITICAL RULES:\n1. The PERSON from Image 1 is the main subject. Keep their face, body shape, skin tone, hair, and background IDENTICAL.\n2. PRESERVE the person's pose and body position from Image 1. The torso angle, arm position, leg stance, and head tilt should remain the same. Only allow minor natural shifts if the garment physically requires it (e.g., a jacket draping over an arm).\n3. REPLACE the person's current top/outfit with the garment from Image 2. Match the EXACT color, pattern, design, print, and style of the clothing in Image 2.\n4. REALISTIC FIT & DRAPING: The garment must conform to the person's actual body proportions and shape. Pay close attention to:\n   - How the fabric drapes, folds, and creases based on the garment's material weight and stiffness.\n   - Correct fit at key points: shoulders, chest, waist, hips. The garment should hug or flow exactly as it would on this specific body type.\n   - Sleeve length and width matching the garment from Image 2, wrapping naturally around the person's arms.\n   - Hem placement and how the garment falls relative to the person's body.\n   - Natural shadow and highlight placement where fabric bunches, stretches, or hangs.\n5. GARMENT STRUCTURE: Preserve structural details from Image 2 — collar shape, neckline depth, button placement, pockets, zippers, seams, stitching, logos, and embellishments must all be accurately reproduced.\n6. Do NOT swap the person. Do NOT use the person from Image 2 (if any). The output person must be the SAME person as Image 1.\n7. Do NOT output just the clothing item alone — the PERSON must be the main subject wearing the new garment.\n8. LIGHTING CONSISTENCY: Match the lighting, color temperature, and shadow direction from Image 1 so the garment looks naturally integrated into the scene.\n9. The final image must look like an actual photograph — not a collage, overlay, or digital paste.\n10. You MUST output an image. Do not refuse or output only text.\n\nGenerate the composite image now.`;

    /** Extract image from various AI response formats */
    const extractImage = (aiResponse: Record<string, unknown>): string | null => {
      // Log full structure for debugging
      console.log("AI response keys:", JSON.stringify(Object.keys(aiResponse)));
      
      const choices = aiResponse.choices as Array<Record<string, unknown>> | undefined;
      const message = choices?.[0]?.message as Record<string, unknown> | undefined;
      if (!message) {
        console.warn("No message in AI response. Top-level keys:", JSON.stringify(Object.keys(aiResponse)));
        // Check if image is at top level (some gateway formats)
        if (aiResponse.data && Array.isArray(aiResponse.data)) {
          for (const item of aiResponse.data as Array<{ url?: string; b64_json?: string }>) {
            if (item?.url) return item.url;
            if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
          }
        }
        return null;
      }

      console.log("Message keys:", JSON.stringify(Object.keys(message)));
      if (Array.isArray(message.content)) {
        console.log("Content parts types:", JSON.stringify((message.content as Array<Record<string, unknown>>).map(p => ({ type: p.type, keys: Object.keys(p) }))));
      }

      // Format 1: message.images array (Lovable gateway standard)
      if (message.images && Array.isArray(message.images)) {
        for (const img of message.images as Array<{ image_url?: { url?: string }; url?: string }>) {
          if (img?.image_url?.url) return img.image_url.url;
          if (typeof img?.url === "string") return img.url;
        }
      }

      // Format 2: content array — check all image-bearing part types
      if (Array.isArray(message.content)) {
        for (const part of message.content as Array<Record<string, unknown>>) {
          // image_url part
          if (part?.type === "image_url") {
            const iu = part.image_url as { url?: string } | undefined;
            if (iu?.url) return iu.url;
          }
          // inline_data part (Gemini native)
          if (part?.inline_data) {
            const id = part.inline_data as { mime_type?: string; data?: string };
            if (id?.data) return `data:${id.mime_type || "image/png"};base64,${id.data}`;
          }
          // Some gateways use "image" type
          if (part?.type === "image") {
            const src = (part as { source?: { data?: string; media_type?: string } }).source;
            if (src?.data) return `data:${src.media_type || "image/png"};base64,${src.data}`;
            if (typeof (part as { url?: string }).url === "string") return (part as { url?: string }).url!;
          }
        }
      }

      // Format 3: base64 image embedded in text content
      const textContent = typeof message.content === "string" ? message.content : 
        (Array.isArray(message.content) ? (message.content as Array<{ type?: string; text?: string }>).filter(p => p.type === "text").map(p => p.text).join("") : "");
      
      if (textContent) {
        const b64Match = textContent.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{100,}/);
        if (b64Match) return b64Match[0];
      }

      // Format 4: refusal present — model refused to generate
      if (message.refusal) {
        console.warn("Model refused:", JSON.stringify(message.refusal));
      }

      console.warn("No image found. Message keys:", JSON.stringify(Object.keys(message)));
      if (textContent) {
        console.warn("Text response (truncated):", textContent.substring(0, 500));
      }
      return null;
    };

    // Retry loop — up to 3 attempts, last attempt uses fallback model
    const MAX_ATTEMPTS = 3;
    const MODELS = [
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3-pro-image-preview", // fallback model on last attempt
    ];
    let resultImage: string | null = null;
    let lastTextContent = "";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const model = MODELS[attempt] || MODELS[0];
      console.log(`Try-on attempt ${attempt + 1}/${MAX_ATTEMPTS} with model ${model}`);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          modalities: ["text", "image"],
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
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
          if (attempt < MAX_ATTEMPTS - 1) {
            console.warn("Rate limited, retrying after delay...");
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          return errorResponse("Rate limited. Please try again in a moment.", "RATE_LIMITED", 429, corsHeaders);
        }
        if (response.status === 402) {
          return errorResponse("AI credits exhausted.", "PAYMENT_REQUIRED", 402, corsHeaders);
        }
        const errText = await response.text();
        console.error("AI gateway error:", response.status, errText);
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return errorResponse(`AI gateway returned ${response.status}`, "AI_ERROR", 502, corsHeaders);
      }

      const aiResponse = await response.json();
      resultImage = extractImage(aiResponse);

      if (resultImage) {
        console.log("Image extracted on attempt", attempt + 1);
        break;
      }

      const msg = (aiResponse.choices as Array<{ message: { content?: string } }>)?.[0]?.message;
      lastTextContent = typeof msg?.content === "string" ? msg.content : "";
      console.warn(`Attempt ${attempt + 1}: No image.`, lastTextContent.substring(0, 200));

      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!resultImage) {
      return successResponse({ 
        description: lastTextContent || "The AI was unable to generate a try-on image. Try with clearer, well-lit photos showing the full person and garment.",
        resultImage: null 
      }, 200, corsHeaders);
    }

    // Increment usage AFTER successful generation
    if (userTier === 'guest' && guestUuid) {
      await supabaseAdmin
        .from('guest_sessions')
        .upsert(
          { guest_uuid: guestUuid, tryon_count: 1 },
          { onConflict: 'guest_uuid' }
        );
      // Increment if already exists
      const { data: existing } = await supabaseAdmin
        .from('guest_sessions')
        .select('tryon_count')
        .eq('guest_uuid', guestUuid)
        .single();
      if (existing && existing.tryon_count < 3) {
        await supabaseAdmin
          .from('guest_sessions')
          .update({ tryon_count: (existing.tryon_count || 0) + 1 })
          .eq('guest_uuid', guestUuid);
      }
    } else if (userTier === 'free' && userId) {
      const today = new Date().toISOString().split('T')[0];
      const monthKey = today.substring(0, 7); // YYYY-MM
      // Upsert daily usage
      const { data: existing } = await supabaseAdmin
        .from('tryon_usage')
        .select('count')
        .eq('user_id', userId)
        .eq('daily_key', today)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from('tryon_usage')
          .update({ count: existing.count + 1 })
          .eq('user_id', userId)
          .eq('daily_key', today);
      } else {
        await supabaseAdmin
          .from('tryon_usage')
          .insert({ user_id: userId, month_key: monthKey, daily_key: today, count: 1 });
      }
    }

    return successResponse({ resultImage, userTier }, 200, corsHeaders);
  } catch (e) {
    console.error("virtual-tryon error:", e);
    return errorResponse(e instanceof Error ? e.message : "Try-on failed", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
