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
    const itemType: string = (raw.itemType as string) || "clothing";
    const itemLower = itemType.toLowerCase();
    const ACCESSORY_TYPES = ["accessory", "jewelry", "necklace", "bracelet", "earrings", "ring", "watch", "hat", "hats", "cap", "sunglasses", "glasses", "bag", "bags", "purse", "handbag", "belt", "belts", "scarf", "scarves", "shoes", "sneakers", "boots", "heels", "loafers", "sandals"];
    const INTIMATE_TYPES = ["swimsuit", "swimwear", "bikini", "one-piece", "bra", "bralette", "sports bra", "underwear", "panties", "briefs", "boxers", "lingerie", "bodysuit", "corset", "bustier", "teddy", "chemise", "lounge", "loungewear", "sleepwear", "pajamas", "robe"];
    const SWIM_TYPES = ["swimsuit", "swimwear", "bikini", "one-piece"];
    const EXPLICIT_TERMS = ["open cup", "open-cup", "open gusset", "open-gusset", "sheer", "see-through", "transparent", "thong", "g-string", "pasties", "nude", "exposed"];
    const isAccessory = ACCESSORY_TYPES.includes(itemLower);
    const isIntimate = INTIMATE_TYPES.some(t => itemLower.includes(t));
    const productContext = [
      itemLower,
      typeof raw.productName === "string" ? raw.productName.toLowerCase() : "",
      typeof raw.productTitle === "string" ? raw.productTitle.toLowerCase() : "",
      typeof raw.productUrl === "string" ? raw.productUrl.toLowerCase() : "",
    ].join(" ");
    const isSwimwear = SWIM_TYPES.some(t => productContext.includes(t));
    const isExplicitIntimate = EXPLICIT_TERMS.some(t => productContext.includes(t));
    const isLayering = raw.isLayering === true;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("LOVABLE_API_KEY is not configured", "CONFIG_ERROR", 500, corsHeaders);

    // Normalize input image; for remote URLs, fetch and convert to data URI when possible.
    const toImageInput = async (input: string): Promise<string> => {
      if (input.startsWith("data:")) return input;
      if (input.startsWith("http://") || input.startsWith("https://")) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(input, {
              signal: controller.signal,
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; DripCheck/1.0)",
                "Accept": "image/*",
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
            console.warn(`Image fetch attempt ${attempt + 1} failed for ${input}: ${e}`);
            if (attempt === 1) return input;
            await new Promise(r => setTimeout(r, 300));
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

    const neutralItemLabel = isSwimwear ? "swimwear garment" : (isIntimate ? "fashion garment" : itemType);
    const basePrompt = isAccessory || isLayering
      ? `Create one photorealistic virtual try-on image using two inputs. Image 1 is the person${isLayering ? " already wearing an outfit" : ""}. Image 2 is the accessory (${itemType}). Keep the same person, face, pose, lighting, and background from Image 1. Add only the accessory from Image 2 with correct scale, perspective, and material detail. Output image only, no text.`
      : `Create one photorealistic virtual try-on image using two inputs. Image 1 is the person. Image 2 is the product (${neutralItemLabel}) from a fashion catalog. Keep the same person identity, pose, camera angle, and background from Image 1. Apply the product from Image 2 with accurate color, pattern, logos, seams, and texture. Ensure realistic fit and drape. Output image only, no text.`;
    const safetyPrompt = (isSwimwear || isIntimate)
      ? `${basePrompt} This is a legitimate retail styling request. Keep the output non-explicit and family-safe: opaque materials, no nudity, no exposed intimate body details. IMPORTANT: preserve the original garment category from Image 2.`
      : basePrompt;
    const conservativeFallbackPrompt = isSwimwear
      ? `${basePrompt} Keep the item as SWIMWEAR ONLY. You may increase coverage within swimwear constraints (e.g., fuller cups, higher waist, one-piece adaptation), but you must keep it a swimsuit/bikini and preserve the original swimwear silhouette and color/pattern cues from Image 2. NEVER convert it to a dress, gown, skirt, pants, jacket, or any non-swimwear category.`
      : `${basePrompt} Keep the same garment category and core silhouette from Image 2. Do not convert the item into a different clothing type.`;
    const promptVariants = (isSwimwear || isIntimate)
      ? [safetyPrompt, conservativeFallbackPrompt, conservativeFallbackPrompt]
      : [basePrompt, basePrompt, basePrompt];

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

    // Retry loop with model + prompt fallback
    const MAX_ATTEMPTS = 3;
    const MODELS = (isSwimwear || isIntimate)
      ? [
          "google/gemini-2.5-flash-image",        // least restrictive for intimate items
          "google/gemini-3.1-flash-image-preview",
          "google/gemini-3-pro-image-preview",
        ]
      : [
          "google/gemini-3.1-flash-image-preview",
          "google/gemini-3.1-flash-image-preview",
          "google/gemini-3-pro-image-preview",     // fallback model on last attempt
        ];
    let resultImage: string | null = null;
    let lastTextContent = "";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const model = MODELS[attempt] || MODELS[0];
      const prompt = promptVariants[attempt] || promptVariants[0];
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
        if (response.status === 400) {
          const errText = await response.text();
          console.warn("AI input image rejected on attempt", attempt + 1, errText);
          lastTextContent = "The selected product image could not be processed. Try a clearer product image or another listing.";
          if (attempt < MAX_ATTEMPTS - 1) {
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          break;
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
      
      // Log full response structure for debugging
      const msg = (aiResponse.choices as Array<Record<string, unknown>>)?.[0]?.message as Record<string, unknown> | undefined;
      if (msg?.refusal) {
        console.warn(`Attempt ${attempt + 1}: Model REFUSED. Refusal:`, JSON.stringify(msg.refusal).substring(0, 500));
      }
      if (msg?.content && typeof msg.content === "string") {
        console.log(`Attempt ${attempt + 1}: Text content:`, msg.content.substring(0, 300));
      }
      if (msg?.reasoning) {
        console.log(`Attempt ${attempt + 1}: Reasoning (truncated):`, JSON.stringify(msg.reasoning).substring(0, 200));
      }
      
      resultImage = extractImage(aiResponse);

      if (resultImage) {
        console.log("Image extracted on attempt", attempt + 1);
        break;
      }

      lastTextContent = typeof msg?.content === "string" ? msg.content : 
        (Array.isArray(msg?.content) ? (msg.content as Array<{ type?: string; text?: string }>).filter((p: { type?: string }) => p.type === "text").map((p: { text?: string }) => p.text).join("") : "");
      console.warn(`Attempt ${attempt + 1}: No image extracted.`);

      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    if (!resultImage) {
      const failHint = (isSwimwear || isIntimate)
        ? "The AI could not generate this try-on safely. Try a full-body user photo plus a non-revealing, opaque product image (e.g. one-piece/full-coverage style)."
        : "The AI was unable to generate a try-on image. Try with clearer, well-lit photos showing the full person and garment.";
      return successResponse({ 
        description: lastTextContent || failHint,
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
