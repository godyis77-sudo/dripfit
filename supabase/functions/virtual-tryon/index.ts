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
      return errorResponse("Request body is empty or malformed.", "VALIDATION_ERROR", 400, corsHeaders);
    }

    const { userPhoto, clothingPhoto } = raw;
    if (!userPhoto || typeof userPhoto !== 'string' || userPhoto.length > 15_000_000) {
      return errorResponse('Invalid user photo', 'VALIDATION_ERROR', 400, corsHeaders);
    }
    if (!clothingPhoto || typeof clothingPhoto !== 'string' || clothingPhoto.length > 15_000_000) {
      return errorResponse('Invalid clothing photo', 'VALIDATION_ERROR', 400, corsHeaders);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── AUTH & RATE LIMITING ──
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

    if (userTier === 'guest') {
      if (!guestUuid) return errorResponse('Guest UUID required', 'AUTH_ERROR', 401, corsHeaders);
      const { data: session } = await supabaseAdmin
        .from('guest_sessions').select('tryon_count').eq('guest_uuid', guestUuid).maybeSingle();
      if ((session?.tryon_count ?? 0) >= 3) {
        return errorResponse('Guest try-on limit reached. Create a free account for more.', 'GUEST_LIMIT', 403, corsHeaders);
      }
    } else if (userTier === 'free' && userId) {
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await supabaseAdmin
        .from('tryon_usage').select('count').eq('user_id', userId).eq('daily_key', today).maybeSingle();
      if ((usage?.count ?? 0) >= 10) {
        return errorResponse('Daily try-on limit reached (10/day). Upgrade to Premium for unlimited.', 'DAILY_LIMIT', 403, corsHeaders);
      }
    }

    const parsed = parseOrError(VirtualTryonSchema, raw);
    if (!parsed.success) return errorResponse(parsed.error, "VALIDATION_ERROR", 400, corsHeaders);

    // ── CLASSIFY ITEM ──
    const itemType: string = (raw.itemType as string) || "clothing";
    const normalizedItemType = itemType.toLowerCase().replace(/underware/g, "underwear");
    const itemLower = normalizedItemType;
    const productName = typeof raw.productName === "string" ? raw.productName : "";
    const productBrand = typeof raw.productBrand === "string" ? raw.productBrand : "";
    const productCategory = typeof raw.productCategory === "string" ? raw.productCategory : "";

    const ACCESSORY_TYPES = ["accessory", "jewelry", "necklace", "bracelet", "earrings", "ring", "watch", "hat", "hats", "cap", "sunglasses", "glasses", "bag", "bags", "purse", "handbag", "belt", "belts", "scarf", "scarves", "shoes", "sneakers", "boots", "heels", "loafers", "sandals"];
    const INTIMATE_TYPES = ["swimsuit", "swimwear", "bikini", "one-piece", "bra", "bralette", "sports bra", "underwear", "underware", "panties", "briefs", "boxers", "lingerie", "bodysuit", "corset", "bustier", "teddy", "chemise", "lounge", "loungewear", "sleepwear", "pajamas", "robe"];
    const UNDERWEAR_TYPES = ["underwear", "underware", "panties", "briefs", "boxers", "bra", "bralette", "sports bra", "lingerie", "bodysuit", "corset", "bustier", "teddy", "chemise"];
    const SWIM_TYPES = ["swimsuit", "swimwear", "bikini", "one-piece"];
    const EXPLICIT_TERMS = ["open cup", "open-cup", "sheer", "see-through", "transparent", "thong", "g-string", "pasties", "nude", "exposed"];

    const isAccessory = ACCESSORY_TYPES.includes(itemLower);
    const productContext = [
      itemLower,
      productName.toLowerCase(),
      productCategory.toLowerCase(),
      typeof raw.productUrl === "string" ? raw.productUrl.toLowerCase() : "",
    ].join(" ");
    const isSwimwear = SWIM_TYPES.some(t => productContext.includes(t));
    const isUnderwear = UNDERWEAR_TYPES.some(t => productContext.includes(t));
    const isIntimate = INTIMATE_TYPES.some(t => itemLower.includes(t)) || isSwimwear || isUnderwear;
    const isExplicitIntimate = EXPLICIT_TERMS.some(t => productContext.includes(t));
    const isLayering = raw.isLayering === true;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("LOVABLE_API_KEY not configured", "CONFIG_ERROR", 500, corsHeaders);

    // ── PREPARE IMAGES ──
    const toImageInput = (input: string): string => {
      if (input.startsWith("data:")) return input;
      if (input.startsWith("http://") || input.startsWith("https://")) return input.trim();
      return `data:image/jpeg;base64,${input}`;
    };

    const userImageInput = toImageInput(userPhoto);
    const clothingImageInput = toImageInput(clothingPhoto);

    const neutralItemLabel = isUnderwear
      ? "athletic base-layer set"
      : isSwimwear
        ? "swimwear set"
        : isIntimate
          ? "fitted fashion garment"
          : itemType;
    const isIntimateGarment = isSwimwear || isUnderwear || isIntimate;
    const FUNCTION_BUDGET_MS = 55_000;
    const MIN_REQUIRED_MS_PER_ATTEMPT = 6_000;
    const startedAt = Date.now();

    // ── EXTRACT GARMENT FROM PRODUCT IMAGE (OPTIONAL) ──
    // Keep off by default to avoid burning budget before first generation attempt.
    // Use refusal-rescue extraction, or force via request for troubleshooting.
    const forceIntimateExtraction = raw.forceIntimateExtraction === true;
    const disableIntimateExtraction = raw.disableIntimateExtraction === true;
    const enableIntimateExtraction = isIntimateGarment && !disableIntimateExtraction && (forceIntimateExtraction || isUnderwear);
    const extractIntimateGarment = async (): Promise<string | null> => {
      const extractPrompt = `Isolate ONLY the target garment from this product photo. Remove any person/model/mannequin and any visible skin. Return a clean product-only image of the ${neutralItemLabel} on a plain white background. Keep garment color, shape, straps, seams, and logos accurate.`;
      const extractionPlan: Array<{ model: string; timeoutMs: number; label: string }> = [
        { model: "google/gemini-2.5-flash-image", timeoutMs: 10_000, label: "extract-nano" },
        { model: "google/gemini-3.1-flash-image-preview", timeoutMs: 12_000, label: "extract-fast" },
      ];

      for (const plan of extractionPlan) {
        const remainingMs = FUNCTION_BUDGET_MS - (Date.now() - startedAt);
        if (remainingMs <= MIN_REQUIRED_MS_PER_ATTEMPT) return null;

        const timeoutMs = Math.min(plan.timeoutMs, Math.max(4_000, remainingMs - 1_000));

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              signal: controller.signal,
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: plan.model,
                modalities: ["image", "text"],
                messages: [{
                  role: "user",
                  content: [
                    { type: "text", text: extractPrompt },
                    { type: "image_url", image_url: { url: clothingImageInput } },
                  ],
                }],
              }),
            });

            if (!extractResponse.ok) {
              console.warn(`Garment extraction HTTP ${extractResponse.status} (${plan.label}), retrying`);
              continue;
            }

            const extractData = await extractResponse.json();
            const extracted = extractImageFromResponse(extractData);
            if (!extracted) {
              console.warn(`Garment extraction returned no image (${plan.label}), retrying`);
              continue;
            }

            console.log(`Garment extracted successfully (${plan.label})`);
            return extracted;
          } finally {
            clearTimeout(timer);
          }
        } catch (err) {
          console.warn(`Garment extraction failed/timed out (${plan.label}), retrying:`, err);
        }
      }

      return null;
    };

    let garmentOnlyImage = clothingImageInput;
    if (enableIntimateExtraction) {
      const extracted = await extractIntimateGarment();
      if (extracted) garmentOnlyImage = extracted;
      console.log(`Intimate extraction took ${Date.now() - startedAt}ms`);
    }

    const productDesc = [productName, productBrand ? `by ${productBrand}` : "", productCategory ? `(${productCategory})` : ""].filter(Boolean).join(" ");
    const sanitizedProductDesc = isIntimateGarment
      ? productDesc
          .replace(/\b(lingerie|underwear|panties|briefs|boxers)\b/gi, "base-layer")
          .replace(/\b(sports bra|bra|bralette)\b/gi, "support top")
          .replace(/\b(open cup|open-cup|thong|g-string)\b/gi, "full-coverage")
          .replace(/\b(sheer|see-through|transparent)\b/gi, "opaque")
          .replace(/\s+/g, " ")
          .trim()
      : productDesc;
    const productHint = sanitizedProductDesc ? `\nProduct: "${sanitizedProductDesc}".` : "";

    const garmentDescriptor = sanitizedProductDesc || (isIntimateGarment
      ? "sporty fitted garment with retail styling"
      : `${itemType} with catalog-style details`);

    // ── BUILD PROMPT ──
    const safetyNote = isExplicitIntimate
      ? "Render sheer/transparent sections as opaque while preserving design details."
      : "Keep output commercially appropriate for retail catalog standards.";

    let prompt: string;

    if (isAccessory || isLayering) {
      prompt = `You are a fashion photo editor. Generate ONE photorealistic image.

IMAGES PROVIDED:
- Image A (first image below): A person — preserve their face, body, pose, background EXACTLY.
- Image B (second image below): The isolated target accessory — replicate this EXACT item.

TARGET ACCESSORY:
- The accessory shown in Image B.${productHint}

TASK: Add the accessory from Image B onto the person in Image A. Match Image B exactly (color, shape, material, branding). Keep everything else unchanged. Correct scale, lighting, shadows. No text/watermarks.`;
    } else if (isIntimateGarment) {
      prompt = `You are an e-commerce product photographer for a mainstream fashion retailer (Nordstrom, ASOS, Target).

IMAGE A: A model posing for a fashion shoot.
IMAGE B: A ${neutralItemLabel} product listing photo from an online store.

TASK: Create a single professional product catalog photo. Dress the model from Image A in the ${neutralItemLabel} shown in Image B. This is a standard product listing image.

STYLING RULES:
- Replace whatever the model is currently wearing with the product from Image B.
- If Image B shows a model/mannequin, copy only the garment — ignore that person.
- Accurately reproduce the product details: color, fabric texture, cut lines, straps, neckline, hemline, logos, and prints.
- Keep the model's face, body shape, skin tone, hair, and pose identical to Image A.
- Natural studio lighting, realistic fabric drape and shadows.
- Standard e-commerce photography — clean, professional, retail-appropriate.
- Do NOT add extra clothing items not present in Image B.
- ${safetyNote}

Output: One clean product listing photo. No text, watermarks, or collages.`;
    } else {
      prompt = `You are a fashion photo editor. Generate ONE photorealistic image.

IMAGES PROVIDED:
- Image A (first image below): A person wearing some outfit. This is the MODEL — keep face, body, hair, skin, and pose.
- Image B (second image below): The target garment — replicate this EXACT garment.

TARGET GARMENT:
- The garment shown in Image B.${productHint}

TASK — CLOTHING SWAP:
1. COMPLETELY STRIP every piece of clothing from Image A — tops, bottoms, pants, skirts, shoes, accessories — remove ALL of them.
2. Dress the now-bare person ONLY in the garment from Image B. If Image B is a top/shirt/blouse, the person should wear ONLY that top with bare legs (no pants, no skirt, no shorts unless Image B includes them).
3. Match Image B exactly: same color, pattern, print, neckline, sleeve length, hemline, cut, texture, and logos.
4. Keep Image A person identity (face, body, hair, skin tone, pose) and background/scene unchanged.
5. Keep garment fit realistic with natural wrinkles and shadows.

CRITICAL: Do NOT keep any original clothing from Image A. The ONLY clothing in the output must be the garment from Image B.

Output: A single photorealistic image. No text/watermarks/split views.`;
    }

    // ── AI CALL ──
    const fallbackPrompt = (isAccessory || isLayering)
      ? `Create ONE photorealistic output image.
Image A = person. Image B = target accessory.${productHint}
Place the accessory from Image B onto the person in Image A at realistic scale and lighting.
Match Image B exactly. Keep face/body/background from Image A unchanged. No text/watermark.`
      : isIntimateGarment
        ? `E-commerce product listing photo. Image A = model. Image B = ${neutralItemLabel} from an online retailer.
Dress the model from Image A in the product from Image B. Standard retail catalog style (Nordstrom/ASOS).
If Image B has a model/mannequin, copy only the garment details — ignore that person.
Match product exactly: color, cut, fabric, straps, neckline. Keep model identity and pose from Image A.
Retail-appropriate, professional. ${safetyNote} No text/watermark.`
        : `Create ONE photorealistic clothing-swap image.
Image A = person. Image B = target garment.${productHint}
STRIP ALL clothing from Image A — tops, bottoms, pants, shoes, everything.
Dress the person ONLY in the exact garment from Image B. If it is a top, show bare legs — do NOT keep pants or bottoms from Image A.
Preserve face, body shape, skin tone, pose, camera, and background from Image A.
Match Image B exactly (color, pattern, cut, neckline, sleeve/hem length, logos). No text/watermark.`;

    const fastIntimatePrompt = `Retail product listing photo. Image A = model. Image B = ${neutralItemLabel}.
Dress model A in the product from Image B. If Image B has a person, extract only the garment.
Mainstream e-commerce catalog style. Keep model identity from Image A. Match product details exactly. ${safetyNote} No text/watermark.`;

    const typeLabel = isAccessory || isLayering ? "accessory" : isIntimateGarment ? "intimate" : "standard";
    const attemptPlan: Array<{ model: string; prompt: string; label: string }> = isIntimateGarment
      ? [
          { model: "google/gemini-2.5-flash-image", prompt, label: `${typeLabel}-nano-primary` },
          { model: "google/gemini-3.1-flash-image-preview", prompt: fallbackPrompt, label: `${typeLabel}-flash-fallback` },
          { model: "google/gemini-2.5-flash-image", prompt: fastIntimatePrompt, label: `${typeLabel}-nano-last` },
        ]
      : [
          { model: "google/gemini-3.1-flash-image-preview", prompt, label: `${typeLabel}-primary` },
          { model: "google/gemini-3-pro-image-preview", prompt: fallbackPrompt, label: `${typeLabel}-pro-retry` },
        ];

    let resultImage: string | null = null;
    let lastTextContent = "";
    let sawIntimateRefusal = false;
    let attemptedRefusalExtraction = false;

    for (let attempt = 0; attempt < attemptPlan.length; attempt++) {
      const plan = attemptPlan[attempt];
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = FUNCTION_BUDGET_MS - elapsedMs;

      if (remainingMs <= MIN_REQUIRED_MS_PER_ATTEMPT) {
        console.warn(`Stopping — insufficient time budget (remaining=${remainingMs}ms).`);
        break;
      }

      // Cap each attempt so one slow model can't starve later retries.
      const attemptsLeftAfterThis = attemptPlan.length - attempt - 1;
      const reserveForRetriesMs = attemptsLeftAfterThis * MIN_REQUIRED_MS_PER_ATTEMPT + 2_000;
      const maxAttemptBudgetMs = isIntimateGarment
        ? (attempt === 0 ? 11_000 : attempt === 1 ? 11_000 : 10_000)
        : (attempt === 0 ? 30_000 : 18_000);
      const timeoutMs = Math.min(
        maxAttemptBudgetMs,
        Math.max(MIN_REQUIRED_MS_PER_ATTEMPT, remainingMs - reserveForRetriesMs),
      );
      const isFinalAttempt = attempt === attemptPlan.length - 1;

      console.log(`Try-on attempt ${attempt + 1}/${attemptPlan.length} model=${plan.model} timeout=${timeoutMs}ms label=${plan.label}`);

      let response: Response;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: plan.model,
              modalities: ["image", "text"],
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: plan.prompt },
                  { type: "text", text: "\n\n========== IMAGE A — THE PERSON (keep this person's face/body) ==========" },
                  { type: "image_url", image_url: { url: userImageInput } },
                  { type: "text", text: "\n\n========== IMAGE B — THE TARGET GARMENT (replicate this garment exactly) ==========" },
                  { type: "image_url", image_url: { url: garmentOnlyImage } },
                ],
              }],
            }),
          });
        } finally {
          clearTimeout(timer);
        }
      } catch (fetchErr) {
        const isTimeout = (fetchErr instanceof DOMException || fetchErr instanceof Error) && (fetchErr as { name: string }).name === "AbortError";
        console.warn(`Attempt ${attempt + 1} (${plan.label}): ${isTimeout ? "TIMEOUT" : "FAILED"}`, fetchErr);
        if (!lastTextContent || !lastTextContent.toLowerCase().includes("rejected this garment style")) {
          lastTextContent = isFinalAttempt
            ? (isTimeout
              ? "The AI request timed out across all retries. Try again with a clearer front-facing clothing photo."
              : "The AI request failed after all retries. Please try a different photo.")
            : (isTimeout
              ? "The AI request timed out. Trying a quicker fallback now."
              : "The AI request failed. Trying a fallback now.");
        }
        if (!isFinalAttempt) {
          await new Promise(r => setTimeout(r, isTimeout ? 300 : 700));
          continue;
        }
        break;
      }

      if (!response.ok) {
        if (response.status === 429) {
          if (!isFinalAttempt) {
            await new Promise(r => setTimeout(r, 1200));
            continue;
          }
          return errorResponse("Rate limited. Try again shortly.", "RATE_LIMITED", 429, corsHeaders);
        }
        if (response.status === 402) return errorResponse("AI credits exhausted.", "PAYMENT_REQUIRED", 402, corsHeaders);

        const errText = await response.text();
        console.error(`AI error ${response.status} (${plan.label}):`, errText.substring(0, 300));
        if (!isFinalAttempt) {
          await new Promise(r => setTimeout(r, 800));
          continue;
        }
        return errorResponse(`AI gateway error ${response.status}`, "AI_ERROR", 502, corsHeaders);
      }

      const aiData = await response.json();
      resultImage = extractImageFromResponse(aiData);

      if (resultImage) {
        console.log(`Image extracted on attempt ${attempt + 1} (${plan.label})`);
        break;
      }

      const msg = (aiData.choices as Array<Record<string, unknown>>)?.[0]?.message as Record<string, unknown> | undefined;
      const refusal = msg && Object.prototype.hasOwnProperty.call(msg, "refusal") ? msg.refusal : undefined;
      const messageText = typeof msg?.content === "string"
        ? msg.content
        : (Array.isArray(msg?.content)
          ? (msg.content as Array<{ type?: string; text?: string }>).filter(p => p.type === "text").map(p => p.text || "").join("")
          : "");

      const refusalSignal = `${typeof refusal === "string" ? refusal : ""} ${messageText}`.toLowerCase();
      const looksLikeRefusal = refusal !== undefined || /reject|refus|policy|unsafe|cannot|can't|unable/.test(refusalSignal);

      if (refusal !== undefined) {
        console.warn(`REFUSED (${plan.label}):`, JSON.stringify(refusal).substring(0, 300));
      }

      let extractedAfterRefusal = false;

      if (looksLikeRefusal && isIntimateGarment) {
        sawIntimateRefusal = true;
        if (!lastTextContent) {
          lastTextContent = "Try-on was blocked for this product photo. Use a front-facing product-only image or flat-lay with the full garment visible.";
        }

        if (!attemptedRefusalExtraction) {
          attemptedRefusalExtraction = true;
          const rescuedGarment = await extractIntimateGarment();
          if (rescuedGarment) {
            garmentOnlyImage = rescuedGarment;
            extractedAfterRefusal = true;
            console.log(`Refusal rescue extracted garment (${plan.label}); retrying with cleaned product image.`);
          }
        }
      }

      if (messageText) {
        const looksLikeStyleRejection = /rejected this garment style|cannot generate|unable to generate|policy|safety/.test(messageText.toLowerCase());
        lastTextContent = (isIntimateGarment && looksLikeStyleRejection)
          ? "Try-on was blocked for this product photo. Use a front-facing product-only image or flat-lay with the full garment visible."
          : messageText;
      }
      if (lastTextContent) console.warn(`Text-only response (${plan.label}):`, lastTextContent.substring(0, 300));
      console.warn(`Attempt ${attempt + 1} (${plan.label}): No image extracted. Keys=${JSON.stringify(Object.keys(msg || {}))}`);

      if (extractedAfterRefusal && !isFinalAttempt) {
        continue;
      }

      if (!isFinalAttempt) await new Promise(r => setTimeout(r, 600));
    }

    if (!resultImage && isIntimateGarment && sawIntimateRefusal) {
      const rescuedGarment = await extractIntimateGarment();
      if (rescuedGarment) {
        garmentOnlyImage = rescuedGarment;
        const elapsedMs = Date.now() - startedAt;
        const remainingMs = FUNCTION_BUDGET_MS - elapsedMs;
        if (remainingMs > MIN_REQUIRED_MS_PER_ATTEMPT) {
          const rescueTimeoutMs = Math.min(22_000, Math.max(MIN_REQUIRED_MS_PER_ATTEMPT, remainingMs - 1_000));
          console.log(`Try-on refusal rescue model=google/gemini-2.5-flash-image timeout=${rescueTimeoutMs}ms`);
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), rescueTimeoutMs);
            try {
              const rescueResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                signal: controller.signal,
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-image",
                  modalities: ["image", "text"],
                  messages: [{
                    role: "user",
                    content: [
                      { type: "text", text: fastIntimatePrompt },
                      { type: "text", text: "\n\n========== IMAGE A — THE PERSON (keep this person's face/body) ==========" },
                      { type: "image_url", image_url: { url: userImageInput } },
                      { type: "text", text: "\n\n========== IMAGE B — THE TARGET GARMENT (replicate this garment exactly) ==========" },
                      { type: "image_url", image_url: { url: garmentOnlyImage } },
                    ],
                  }],
                }),
              });

              if (rescueResponse.ok) {
                const rescueData = await rescueResponse.json();
                const rescuedImage = extractImageFromResponse(rescueData);
                if (rescuedImage) {
                  resultImage = rescuedImage;
                  console.log("Image extracted on refusal rescue attempt");
                }
              }
            } finally {
              clearTimeout(timer);
            }
          } catch (rescueErr) {
            console.warn("Refusal rescue failed/timed out:", rescueErr);
          }
        }
      }
    }

    if (!resultImage) {
      if (lastTextContent.toLowerCase().includes("trying a quicker fallback now") || lastTextContent.toLowerCase().includes("trying a fallback now")) {
        lastTextContent = "The AI request timed out across all retries. Try again with a clearer front-facing clothing photo.";
      }
      const failHint = (isSwimwear || isUnderwear || isIntimate)
        ? "The AI could not generate this try-on from the current product photo. Try a full-body user photo plus a front-facing product-only or flat-lay garment image."
        : "The AI was unable to generate a try-on image. Try clearer, well-lit photos showing the full person and garment.";
      return successResponse({ description: lastTextContent || failHint, resultImage: null }, 200, corsHeaders);
    }

    // ── INCREMENT USAGE ──
    if (userTier === 'guest' && guestUuid) {
      const { data: existing } = await supabaseAdmin
        .from('guest_sessions').select('tryon_count').eq('guest_uuid', guestUuid).maybeSingle();
      if (existing) {
        await supabaseAdmin.from('guest_sessions')
          .update({ tryon_count: (existing.tryon_count || 0) + 1 }).eq('guest_uuid', guestUuid);
      } else {
        await supabaseAdmin.from('guest_sessions')
          .insert({ guest_uuid: guestUuid, tryon_count: 1 });
      }
    } else if (userTier === 'free' && userId) {
      const today = new Date().toISOString().split('T')[0];
      const monthKey = today.substring(0, 7);
      const { data: existing } = await supabaseAdmin
        .from('tryon_usage').select('count').eq('user_id', userId).eq('daily_key', today).maybeSingle();
      if (existing) {
        await supabaseAdmin.from('tryon_usage').update({ count: existing.count + 1 }).eq('user_id', userId).eq('daily_key', today);
      } else {
        await supabaseAdmin.from('tryon_usage').insert({ user_id: userId, month_key: monthKey, daily_key: today, count: 1 });
      }
    }

    return successResponse({ resultImage, userTier }, 200, corsHeaders);
  } catch (e) {
    console.error("virtual-tryon error:", e);
    return errorResponse(e instanceof Error ? e.message : "Try-on failed", "INTERNAL_ERROR", 500, corsHeaders);
  }
});

/** Extract image URL/base64 from AI response (handles multiple gateway formats) */
function extractImageFromResponse(aiResponse: Record<string, unknown>): string | null {
  const normalizeCandidate = (value: string): string | null => {
    const trimmed = value.trim().replace(/^["'`]+|["'`]+$/g, "");
    if (!trimmed) return null;
    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(trimmed)) return trimmed;
    if (/^https?:\/\//.test(trimmed)) return trimmed;
    if (/^[A-Za-z0-9+/=]{1000,}$/.test(trimmed)) return `data:image/png;base64,${trimmed}`;
    return null;
  };

  const deepSearch = (node: unknown, keyPath = "", seen = new Set<unknown>()): string | null => {
    if (node == null) return null;
    if (typeof node === "string") {
      const n = normalizeCandidate(node);
      if (!n) return null;
      if (n.startsWith("data:image/")) return n;
      if (/(image|img|photo|url|uri|src|base64|b64)/i.test(keyPath)) return n;
      return null;
    }
    if (typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) { const f = deepSearch(item, keyPath, seen); if (f) return f; }
      return null;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "b64_json" && typeof v === "string" && v.length > 1000) return `data:image/png;base64,${v}`;
      const f = deepSearch(v, keyPath ? `${keyPath}.${k}` : k, seen);
      if (f) return f;
    }
    return null;
  };

  const choices = aiResponse.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  if (!message) {
    // Check top-level data array (some formats)
    if (aiResponse.data && Array.isArray(aiResponse.data)) {
      for (const item of aiResponse.data as Array<{ url?: string; b64_json?: string }>) {
        if (item?.url) return item.url;
        if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
      }
    }
    return null;
  }

  // Format 1: message.images (Lovable gateway)
  if (message.images && Array.isArray(message.images)) {
    for (const img of message.images as Array<{ image_url?: { url?: string }; url?: string }>) {
      if (img?.image_url?.url) return img.image_url.url;
      if (typeof img?.url === "string") return img.url;
    }
  }

  // Format 2: content array parts
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

  // Format 3: base64 in text
  const textContent = typeof message.content === "string" ? message.content :
    (Array.isArray(message.content) ? (message.content as Array<{ type?: string; text?: string }>).filter(p => p.type === "text").map(p => p.text || "").join("") : "");
  if (textContent) {
    const b64 = textContent.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{100,}/);
    if (b64) return b64[0];
    const md = textContent.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
    if (md?.[1]) { const n = normalizeCandidate(md[1]); if (n) return n; }
    const url = textContent.match(/"(?:image_url|url|src|image|imageUrl|output_image)"\s*:\s*"([^"\\]+)"/i);
    if (url?.[1]) { const n = normalizeCandidate(url[1]); if (n) return n; }
  }

  // Format 4: deep search fallback
  return deepSearch(message, "message") || deepSearch(aiResponse, "response");
}

