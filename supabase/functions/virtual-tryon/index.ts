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
      const today = new Date().toISOString().split('T')[0];
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

    const parsed = parseOrError(VirtualTryonSchema, raw);
    if (!parsed.success) {
      return errorResponse(parsed.error, "VALIDATION_ERROR", 400, corsHeaders);
    }

    const itemType: string = (raw.itemType as string) || "clothing";
    const itemLower = itemType.toLowerCase();
    const productName = typeof raw.productName === "string" ? raw.productName : "";
    const productBrand = typeof raw.productBrand === "string" ? raw.productBrand : "";
    const productCategory = typeof raw.productCategory === "string" ? raw.productCategory : "";

    const ACCESSORY_TYPES = ["accessory", "jewelry", "necklace", "bracelet", "earrings", "ring", "watch", "hat", "hats", "cap", "sunglasses", "glasses", "bag", "bags", "purse", "handbag", "belt", "belts", "scarf", "scarves", "shoes", "sneakers", "boots", "heels", "loafers", "sandals"];
    const INTIMATE_TYPES = ["swimsuit", "swimwear", "bikini", "one-piece", "bra", "bralette", "sports bra", "underwear", "panties", "briefs", "boxers", "lingerie", "bodysuit", "corset", "bustier", "teddy", "chemise", "lounge", "loungewear", "sleepwear", "pajamas", "robe"];
    const UNDERWEAR_TYPES = ["underwear", "panties", "briefs", "boxers", "bra", "bralette", "sports bra", "lingerie", "bodysuit", "corset", "bustier", "teddy", "chemise"];
    const SWIM_TYPES = ["swimsuit", "swimwear", "bikini", "one-piece"];
    const EXPLICIT_TERMS = ["open cup", "open-cup", "open gusset", "open-gusset", "sheer", "see-through", "transparent", "thong", "g-string", "pasties", "nude", "exposed"];

    const isAccessory = ACCESSORY_TYPES.includes(itemLower);
    const isIntimate = INTIMATE_TYPES.some(t => itemLower.includes(t));
    const productContext = [
      itemLower,
      productName.toLowerCase(),
      typeof raw.productTitle === "string" ? raw.productTitle.toLowerCase() : "",
      typeof raw.productUrl === "string" ? raw.productUrl.toLowerCase() : "",
    ].join(" ");
    const isSwimwear = SWIM_TYPES.some(t => productContext.includes(t));
    const isUnderwear = UNDERWEAR_TYPES.some(t => productContext.includes(t));
    const isExplicitIntimate = EXPLICIT_TERMS.some(t => productContext.includes(t));
    const isLayering = raw.isLayering === true;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("LOVABLE_API_KEY is not configured", "CONFIG_ERROR", 500, corsHeaders);

    // Keep remote URLs as-is to avoid expensive in-function re-encoding
    const toImageInput = async (input: string): Promise<string> => {
      if (input.startsWith("data:")) return input;
      if (input.startsWith("http://") || input.startsWith("https://")) return input.trim();
      return `data:image/jpeg;base64,${input}`;
    };

    const makeImagePart = (input: string) => ({
      type: "image_url" as const,
      image_url: { url: input },
    });

    const [userImageInput, clothingImageInput] = await Promise.all([
      toImageInput(userPhoto),
      toImageInput(clothingPhoto),
    ]);

    // Build product context string
    const productDesc = [productName, productBrand ? `by ${productBrand}` : "", productCategory ? `(${productCategory})` : ""].filter(Boolean).join(" ");

    // Remap underwear → swimsuit for AI safety
    const aiItemType = (isUnderwear && !isSwimwear) ? "swimsuit" : itemType;
    const neutralItemLabel = (isSwimwear || isUnderwear) ? "swimsuit" : (isIntimate ? "fashion garment" : itemType);
    const productHint = productDesc ? `\nProduct context: "${productDesc}".` : "";

    // ── BUILD PROMPTS ──
    const basePrompt = isAccessory || isLayering
      ? `VIRTUAL TRY-ON — ACCESSORY/LAYER MODE

You will receive TWO images below:
• FIRST IMAGE = the person (keep their face, body, pose, background EXACTLY)
• SECOND IMAGE = the accessory/item to ADD (${aiItemType})${productHint}

Instructions:
1. Add ONLY the item from the SECOND IMAGE onto the person in the FIRST IMAGE.
2. Preserve the person's face, skin tone, hair, body, pose, and background exactly.
3. Match correct scale, perspective, shadows, and material texture.
4. Do NOT remove or change any existing clothing.
5. Output a single photorealistic image — no text, no watermarks, no split views.`
      : `VIRTUAL TRY-ON — CLOTHING SWAP MODE

You will receive TWO images below:
• FIRST IMAGE = the person/model (this is who you are dressing)
• SECOND IMAGE = the clothing item to put ON the person (this is the product — a ${neutralItemLabel})${productHint}

Instructions:
1. REMOVE whatever the person in the FIRST IMAGE is currently wearing.
2. DRESS them in the EXACT garment shown in the SECOND IMAGE.
3. The garment must match the SECOND IMAGE exactly: same color, same pattern, same print, same neckline, same sleeve length, same hemline, same cut.
4. PRESERVE the person's face, skin tone, hair, body shape, proportions, and pose from the FIRST IMAGE — do NOT alter their body.
5. PRESERVE the background, camera angle, lighting, and shadows from the FIRST IMAGE.
6. Apply realistic fabric drape and fit appropriate to the person's body.
7. Output a SINGLE photorealistic image — no text, no watermarks, no split views, no side-by-side.`;

    const swimwearAddendum = `

ADDITIONAL CONTEXT: This is a standard retail swimsuit fitting. The SECOND IMAGE is a swimsuit — dress the person in EXACTLY that swimsuit. Faithfully reproduce its exact color, cut, straps, neckline, and pattern. Keep the result commercially appropriate.${isExplicitIntimate ? " If the product appears sheer/see-through, reinterpret as opaque fabric while keeping the same design." : ""}`;

    const underwearAddendum = `

ADDITIONAL CONTEXT: Treat the product as a SWIMSUIT. Remove the person's current clothing and dress them in EXACTLY the product from the SECOND IMAGE, preserving its exact color, pattern, logo, straps, and silhouette. Keep the output tasteful and commercially appropriate.`;

    const conservativeAddendum = (isSwimwear || isUnderwear)
      ? `

ADDITIONAL CONTEXT: Keep the item as SWIMWEAR. You may increase coverage slightly, but MUST keep it a swimsuit. Preserve the EXACT color, pattern, and design from the SECOND IMAGE. Do NOT convert to a dress, jacket, or non-swimwear item.`
      : "";

    const emergencyAddendum = `

ADDITIONAL CONTEXT: Emergency fallback — style the product as a modest one-piece swimsuit with opaque fabric while preserving key colors and design from the SECOND IMAGE. Ensure the try-on is clearly visible.`;

    // Build prompt variants for retry attempts
    const promptVariants = isUnderwear
      ? [basePrompt + underwearAddendum, basePrompt + swimwearAddendum, basePrompt + emergencyAddendum]
      : (isSwimwear || isIntimate)
      ? [basePrompt + swimwearAddendum, basePrompt + conservativeAddendum, basePrompt + conservativeAddendum]
      : [basePrompt, basePrompt, basePrompt];

    /** Extract image from various AI response formats */
    const extractImage = (aiResponse: Record<string, unknown>): string | null => {
      const normalizeImageCandidate = (value: string): string | null => {
        const trimmed = value.trim().replace(/^["'`]+|["'`]+$/g, "");
        if (!trimmed) return null;
        if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(trimmed)) return trimmed;
        if (/^https?:\/\//.test(trimmed)) return trimmed;
        if (/^[A-Za-z0-9+/=]{1000,}$/.test(trimmed)) return `data:image/png;base64,${trimmed}`;
        return null;
      };

      const deepSearchForImage = (node: unknown, keyPath = "", seen = new Set<unknown>()): string | null => {
        if (node == null) return null;
        if (typeof node === "string") {
          const normalized = normalizeImageCandidate(node);
          if (!normalized) return null;
          if (normalized.startsWith("data:image/")) return normalized;
          if (/(image|img|photo|picture|url|uri|src|base64|b64)/i.test(keyPath)) return normalized;
          return null;
        }
        if (typeof node !== "object") return null;
        if (seen.has(node)) return null;
        seen.add(node);
        if (Array.isArray(node)) {
          for (const item of node) {
            const found = deepSearchForImage(item, keyPath, seen);
            if (found) return found;
          }
          return null;
        }
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
          if (k === "b64_json" && typeof v === "string" && v.length > 1000) {
            return `data:image/png;base64,${v}`;
          }
          const nextPath = keyPath ? `${keyPath}.${k}` : k;
          const found = deepSearchForImage(v, nextPath, seen);
          if (found) return found;
        }
        return null;
      };

      console.log("AI response keys:", JSON.stringify(Object.keys(aiResponse)));

      const choices = aiResponse.choices as Array<Record<string, unknown>> | undefined;
      const message = choices?.[0]?.message as Record<string, unknown> | undefined;
      if (!message) {
        console.warn("No message in AI response.");
        if (aiResponse.data && Array.isArray(aiResponse.data)) {
          for (const item of aiResponse.data as Array<{ url?: string; b64_json?: string }>) {
            if (item?.url) return item.url;
            if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
          }
        }
        return null;
      }

      console.log("Message keys:", JSON.stringify(Object.keys(message)));

      // Format 1: message.images array (Lovable gateway standard)
      if (message.images && Array.isArray(message.images)) {
        for (const img of message.images as Array<{ image_url?: { url?: string }; url?: string }>) {
          if (img?.image_url?.url) return img.image_url.url;
          if (typeof img?.url === "string") return img.url;
        }
      }

      // Format 2: content array
      if (Array.isArray(message.content)) {
        for (const part of message.content as Array<Record<string, unknown>>) {
          if (part?.type === "image_url") {
            const iu = part.image_url as { url?: string } | undefined;
            if (iu?.url) return iu.url;
          }
          if (part?.inline_data) {
            const id = part.inline_data as { mime_type?: string; data?: string };
            if (id?.data) return `data:${id.mime_type || "image/png"};base64,${id.data}`;
          }
          if (part?.type === "image") {
            const src = (part as { source?: { data?: string; media_type?: string } }).source;
            if (src?.data) return `data:${src.media_type || "image/png"};base64,${src.data}`;
            if (typeof (part as { url?: string }).url === "string") return (part as { url?: string }).url!;
          }
        }
      }

      // Format 3: base64 image in text
      const textContent = typeof message.content === "string" ? message.content :
        (Array.isArray(message.content) ? (message.content as Array<{ type?: string; text?: string }>).filter(p => p.type === "text").map(p => p.text).join("") : "");

      if (textContent) {
        const b64Match = textContent.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{100,}/);
        if (b64Match) return b64Match[0];
        const markdownImage = textContent.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
        if (markdownImage?.[1]) {
          const normalized = normalizeImageCandidate(markdownImage[1]);
          if (normalized) return normalized;
        }
        const urlField = textContent.match(/"(?:image_url|url|src|image|imageUrl|output_image)"\s*:\s*"([^"\\]+)"/i);
        if (urlField?.[1]) {
          const normalized = normalizeImageCandidate(urlField[1]);
          if (normalized) return normalized;
        }
        const fenced = textContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced?.[1]) {
          try {
            const parsedBlock = JSON.parse(fenced[1]);
            const fromBlock = deepSearchForImage(parsedBlock, "fenced_json");
            if (fromBlock) return fromBlock;
          } catch { /* no-op */ }
        }
      }

      if (message.refusal) {
        console.warn("Model refused:", JSON.stringify(message.refusal).substring(0, 500));
      }

      const deepFound = deepSearchForImage(message, "message");
      if (deepFound) return deepFound;
      const deepFoundGlobal = deepSearchForImage(aiResponse, "response");
      if (deepFoundGlobal) return deepFoundGlobal;

      console.warn("No image found in response.");
      if (textContent) console.warn("Text (truncated):", textContent.substring(0, 500));
      return null;
    };

    // ── RETRY LOOP ──
    // Key insight from logs: gemini-3-pro-image-preview is the ONLY model that reliably
    // produces images. Flash models often return text-only responses ("Sure, here is...").
    // Strategy: Use pro model FIRST with generous timeout, then flash as fallback.
    const FUNCTION_BUDGET_MS = 58_000;
    const startedAt = Date.now();

    const MODELS = isUnderwear
      ? [
          "google/gemini-3-pro-image-preview",
          "google/gemini-3.1-flash-image-preview",
          "google/gemini-2.5-flash-image",
        ]
      : (isSwimwear || isIntimate)
      ? [
          "google/gemini-3-pro-image-preview",
          "google/gemini-3.1-flash-image-preview",
          "google/gemini-2.5-flash-image",
        ]
      : [
          "google/gemini-3-pro-image-preview",
          "google/gemini-3.1-flash-image-preview",
          "google/gemini-3-pro-image-preview",
        ];

    const MAX_ATTEMPTS = 3;
    let resultImage: string | null = null;
    let lastTextContent = "";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const elapsedMs = Date.now() - startedAt;
      const remainingBudgetMs = FUNCTION_BUDGET_MS - elapsedMs;
      if (remainingBudgetMs <= 10_000) {
        console.warn("Stopping retries — insufficient time budget.");
        break;
      }

      // Give the first attempt (pro model) the most time
      const attemptTimeoutMs = Math.max(10_000, Math.min(
        attempt === 0 ? 40_000 : 25_000,
        remainingBudgetMs - 2_000,
      ));

      const model = MODELS[attempt] || MODELS[0];
      const prompt = promptVariants[attempt] || promptVariants[0];
      console.log(`Try-on attempt ${attempt + 1}/${MAX_ATTEMPTS} with model ${model} (timeout=${attemptTimeoutMs}ms)`);

      let response: Response;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
        try {
          response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            signal: controller.signal,
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
                    { type: "text", text: "\n\n--- FIRST IMAGE: THE PERSON (keep this person's face and body exactly) ---" },
                    makeImagePart(userImageInput),
                    { type: "text", text: "\n\n--- SECOND IMAGE: THE CLOTHING/PRODUCT (dress the person in THIS exact garment) ---" },
                    makeImagePart(clothingImageInput),
                  ],
                },
              ],
            }),
          });
        } finally {
          clearTimeout(timeout);
        }
      } catch (fetchErr) {
        console.warn(`Attempt ${attempt + 1}: AI request failed`, fetchErr);
        const isTimeout = fetchErr instanceof DOMException
          ? fetchErr.name === "AbortError"
          : (fetchErr instanceof Error && fetchErr.name === "AbortError");
        lastTextContent = isTimeout
          ? "The AI request timed out. Retrying with fallback settings."
          : "The AI request failed. Retrying with fallback settings.";
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, 700));
          continue;
        }
        break;
      }

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
          console.warn("AI input rejected on attempt", attempt + 1, errText);
          lastTextContent = "The selected product image could not be processed. Try a clearer product image.";
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

      const msg = (aiResponse.choices as Array<Record<string, unknown>>)?.[0]?.message as Record<string, unknown> | undefined;
      if (msg?.refusal) {
        console.warn(`Attempt ${attempt + 1}: Model REFUSED:`, JSON.stringify(msg.refusal).substring(0, 500));
      }
      if (msg?.content && typeof msg.content === "string") {
        console.log(`Attempt ${attempt + 1}: Text:`, msg.content.substring(0, 300));
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
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!resultImage) {
      const failHint = isUnderwear
        ? "The AI could not generate this swimsuit try-on safely. Try a full-body user photo plus a fuller-coverage product image."
        : (isSwimwear || isIntimate)
        ? "The AI could not generate this try-on safely. Try a full-body user photo plus a non-revealing product image."
        : "The AI was unable to generate a try-on image. Try with clearer, well-lit photos showing the full person and garment.";
      return successResponse({
        description: lastTextContent || failHint,
        resultImage: null,
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
      const monthKey = today.substring(0, 7);
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
