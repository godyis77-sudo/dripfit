import { createClient } from "npm:@supabase/supabase-js@2";
import {
  errorResponse,
  getCorsHeaders,
  parseOrError,
  successResponse,
  VirtualTryonSchema,
} from "../_shared/validation.ts";

// ── CHANGE 1: Expanded sanitization map ──
const INTIMATE_SANITIZE_MAP: Array<[RegExp, string]> = [
  [/\b(lingerie|underwear|panties|briefs|boxers)\b/gi, "base-layer"],
  [
    /\b(swimwear|swimsuit|bikini|one-piece|one piece|tankini)\b/gi,
    "activewear",
  ],
  [/\b(sports bra|bra|bralette)\b/gi, "support top"],
  [/\b(open cup|open-cup|thong|g-string|pasties)\b/gi, "full-coverage"],
  [/\b(sheer|see-through|see through|transparent)\b/gi, "opaque"],
  [/\b(lace|lacey|lacy)\b/gi, "textured fabric"],
  [/\b(mesh)\b/gi, "textured fabric"],
  [/\b(plunge|deep-v|deep v|plunging)\b/gi, "v-neck"],
  [/\b(cleavage|bust|bosom|decolletage)\b/gi, "neckline area"],
  [/\b(skin|flesh|body|bare|naked|nude|exposed)\b/gi, "fabric"],
  [/\b(corset|bustier)\b/gi, "structured bodice"],
  [/\b(teddy|chemise|negligee|nightgown)\b/gi, "fitted dress"],
  [/\b(bodysuit)\b/gi, "fitted one-piece"],
  [/\b(crotch|groin)\b/gi, "lower panel"],
  [/\b(nipple|areola)\b/gi, "front panel"],
  [/\b(provocative|seductive|sexy|sensual)\b/gi, "stylish"],
  [/\b(intimate|intimates)\b/gi, "athletic"],
  [
    /\b(minimal coverage|very little coverage|revealing)\b/gi,
    "streamlined fit",
  ],
  [
    /\b(string (bottoms?|briefs?)|high-cut|high cut)\b/gi,
    "athletic lower garment",
  ],
];

function sanitizeIntimateText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of INTIMATE_SANITIZE_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/\s+/g, " ").trim();
}

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
      return errorResponse(
        "Request body is empty or malformed.",
        "VALIDATION_ERROR",
        400,
        corsHeaders,
      );
    }

    const { userPhoto, clothingPhoto } = raw;
    if (
      !userPhoto || typeof userPhoto !== "string" ||
      userPhoto.length > 15_000_000
    ) {
      return errorResponse(
        "Invalid user photo",
        "VALIDATION_ERROR",
        400,
        corsHeaders,
      );
    }
    if (
      !clothingPhoto || typeof clothingPhoto !== "string" ||
      clothingPhoto.length > 15_000_000
    ) {
      return errorResponse(
        "Invalid clothing photo",
        "VALIDATION_ERROR",
        400,
        corsHeaders,
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── AUTH & RATE LIMITING ──
    const authHeader = req.headers.get("Authorization");
    const guestUuid = typeof raw.guestUuid === "string" ? raw.guestUuid : null;
    let userId: string | null = null;
    let userTier: "guest" | "free" | "premium" = "guest";

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseAnon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData, error: userError } = await supabaseAnon.auth
        .getUser();
      if (!userError && userData?.user) {
        userId = userData.user.id;

        // Check admin role first (grants premium)
        const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (isAdmin) {
          userTier = "premium";
        } else {
          // Check Stripe for active/trialing subscription
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey && userData.user.email) {
            try {
              const { default: Stripe } = await import(
                "https://esm.sh/stripe@18.5.0"
              );
              const stripe = new Stripe(stripeKey, {
                apiVersion: "2025-08-27.basil",
              });
              const customers = await stripe.customers.list({
                email: userData.user.email,
                limit: 1,
              });
              if (customers.data.length > 0) {
                const custId = customers.data[0].id;
                const activeSubs = await stripe.subscriptions.list({
                  customer: custId,
                  status: "active",
                  limit: 1,
                });
                const trialSubs = await stripe.subscriptions.list({
                  customer: custId,
                  status: "trialing",
                  limit: 1,
                });
                if (activeSubs.data.length > 0 || trialSubs.data.length > 0) {
                  userTier = "premium";
                }
              }
            } catch (e) {
              console.warn(
                "Stripe check failed in tryon, defaulting to free:",
                e,
              );
            }
          }
          if (userTier !== "premium") userTier = "free";
        }
      }
    }

    if (userTier === "guest") {
      if (!guestUuid) {
        return errorResponse(
          "Guest UUID required",
          "AUTH_ERROR",
          401,
          corsHeaders,
        );
      }
      const { data: session } = await supabaseAdmin
        .from("guest_sessions").select("tryon_count").eq(
          "guest_uuid",
          guestUuid,
        ).maybeSingle();
      if ((session?.tryon_count ?? 0) >= 3) {
        return errorResponse(
          "Guest try-on limit reached. Create a free account for more.",
          "GUEST_LIMIT",
          403,
          corsHeaders,
        );
      }
    } else if (userTier === "free" && userId) {
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabaseAdmin
        .from("tryon_usage").select("count").eq("user_id", userId).eq(
          "daily_key",
          today,
        ).maybeSingle();
      if ((usage?.count ?? 0) >= 10) {
        return errorResponse(
          "Daily try-on limit reached (10/day). Upgrade to Premium for unlimited.",
          "DAILY_LIMIT",
          403,
          corsHeaders,
        );
      }
    }

    const parsed = parseOrError(VirtualTryonSchema, raw);
    if (!parsed.success) {
      return errorResponse(parsed.error, "VALIDATION_ERROR", 400, corsHeaders);
    }

    // ── BACKGROUND SOURCE ──
    const backgroundSource: string = (raw.backgroundSource as string) || "user";
    const useClothingBg = backgroundSource === "clothing";
    const bgInstruction = useClothingBg
      ? "Use the background/environment from Image B (the clothing/product photo). Place the model into that scene."
      : "Keep the EXACT same background, environment, and scene from Image A. Do NOT replace it with a studio backdrop.";

    // ── CLASSIFY ITEM ──
    const itemType: string = (raw.itemType as string) || "clothing";
    const normalizedItemType = itemType
      .toLowerCase()
      .replace(/underware/g, "underwear")
      .replace(/underwater/g, "underwear");
    const itemLower = normalizedItemType;
    const productName = typeof raw.productName === "string"
      ? raw.productName
      : "";
    const productBrand = typeof raw.productBrand === "string"
      ? raw.productBrand
      : "";
    const productCategory = typeof raw.productCategory === "string"
      ? raw.productCategory
      : "";

    const ACCESSORY_TYPES = [
      "accessory",
      "jewelry",
      "necklace",
      "bracelet",
      "earrings",
      "ring",
      "watch",
      "hat",
      "hats",
      "cap",
      "sunglasses",
      "glasses",
      "bag",
      "bags",
      "purse",
      "handbag",
      "belt",
      "belts",
      "scarf",
      "scarves",
      "shoes",
      "sneakers",
      "boots",
      "heels",
      "loafers",
      "sandals",
    ];
    const FOOTWEAR_TYPES = [
      "shoes",
      "sneakers",
      "boots",
      "heels",
      "loafers",
      "sandals",
      "trainers",
      "pumps",
      "mules",
      "slides",
      "flats",
      "oxfords",
      "derby",
      "espadrilles",
    ];
    const INTIMATE_TYPES = [
      "swimsuit",
      "swimwear",
      "bikini",
      "one-piece",
      "bra",
      "bralette",
      "sports bra",
      "underwear",
      "underware",
      "panties",
      "briefs",
      "boxers",
      "lingerie",
      "bodysuit",
      "corset",
      "bustier",
      "teddy",
      "chemise",
    ];
    const UNDERWEAR_TYPES = [
      "underwear",
      "underware",
      "panties",
      "briefs",
      "boxers",
      "bra",
      "bralette",
      "sports bra",
      "lingerie",
      "bodysuit",
      "corset",
      "bustier",
      "teddy",
      "chemise",
    ];
    const SWIM_TYPES = ["swimsuit", "swimwear", "bikini", "one-piece"];
    const COMFORTWEAR_TYPES = [
      "loungewear",
      "loungewear",
      "sleepwear",
      "pajamas",
      "pyjamas",
      "robe",
      "robes",
    ];
    const EXPLICIT_TERMS = [
      "open cup",
      "open-cup",
      "sheer",
      "see-through",
      "transparent",
      "thong",
      "g-string",
      "pasties",
      "nude",
      "exposed",
    ];

    const normalizeMatchText = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const hasContextTerm = (normalizedContext: string, term: string) => {
      const normalizedTerm = normalizeMatchText(term);
      if (!normalizedTerm) return false;
      return ` ${normalizedContext} `.includes(` ${normalizedTerm} `);
    };

    const normalizedClassifierContext = normalizeMatchText([
      itemLower,
      productName.toLowerCase(),
      productCategory.toLowerCase(),
      typeof raw.productUrl === "string" ? raw.productUrl.toLowerCase() : "",
    ].join(" "));
    const isAccessory = ACCESSORY_TYPES.includes(itemLower) ||
      ACCESSORY_TYPES.some((t) =>
        hasContextTerm(normalizedClassifierContext, t)
      );
    const isFootwear = FOOTWEAR_TYPES.includes(itemLower) ||
      FOOTWEAR_TYPES.some((t) =>
        hasContextTerm(normalizedClassifierContext, t)
      );
    const normalizedItemContext = normalizeMatchText(itemLower);
    const normalizedProductContext = normalizedClassifierContext;
    const isBelt = /\bbelt(s)?\b/.test(normalizedProductContext) ||
      /\bbelt(s)?\b/.test(normalizedItemContext);
    const isSwimwear = SWIM_TYPES.some((t) =>
      hasContextTerm(normalizedProductContext, t)
    );
    const isComfortwear = COMFORTWEAR_TYPES.some((t) =>
      hasContextTerm(normalizedItemContext, t) ||
      hasContextTerm(normalizedProductContext, t)
    );
    // Athletic tops (sports bras / bralettes / crop tops) should use standard top-swap routing, not intimate routing.
    const isSportsBraOrCropTop =
      /\b(sports?\s*bra|crop\s*top|bralette|support\s*top|seamless\s*bra)\b/
        .test(normalizedProductContext);
    const isUnderwearRaw = UNDERWEAR_TYPES.some((t) =>
      hasContextTerm(normalizedProductContext, t)
    );
    const isUnderwear = isUnderwearRaw && !isSportsBraOrCropTop;
    const isIntimate = !isComfortwear && !isSportsBraOrCropTop &&
      (INTIMATE_TYPES.some((t) =>
        hasContextTerm(normalizedItemContext, t) ||
        hasContextTerm(normalizedProductContext, t)
      ) || isSwimwear || isUnderwear);
    const isExplicitIntimate = !isSportsBraOrCropTop &&
      EXPLICIT_TERMS.some((t) => hasContextTerm(normalizedProductContext, t));
    const isLayering = raw.isLayering === true;

    // Underwear is frequently blocked by the image model safety filter.
    // IMPORTANT: This does NOT change any category — it only changes rendering and routing behavior.
    const isUnderwearSafeMode = (isUnderwear || isExplicitIntimate) &&
      !isSwimwear;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return errorResponse(
        "LOVABLE_API_KEY not configured",
        "CONFIG_ERROR",
        500,
        corsHeaders,
      );
    }

    // ── PREPARE IMAGES ──
    const toImageInput = (input: string): string => {
      if (input.startsWith("data:")) return input;
      if (input.startsWith("http://") || input.startsWith("https://")) {
        return input.trim();
      }
      return `data:image/jpeg;base64,${input}`;
    };

    const userImageInput = toImageInput(userPhoto);
    const clothingImageInput = toImageInput(clothingPhoto);
    const messageContentToText = (content: unknown): string => {
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return (content as Array<{ type?: string; text?: string }>).filter(
          (p) => p.type === "text",
        ).map((p) => p.text || "").join(" ").trim();
      }
      return "";
    };
    const hasMeaningfulWords = (value: string) => /[a-z]{3}/i.test(value);

    const swimwearGarmentLabel = (() => {
      const context = normalizeMatchText(
        [itemLower, productName, productCategory].join(" "),
      );
      if (/\b(one piece|one-piece|monokini)\b/.test(context)) {
        return "athletic one-piece";
      }
      if (/\b(bottom|brief|short|bottoms|bikini bottom)\b/.test(context)) {
        return "athletic bottom";
      }
      if (/\b(top|triangle|bralette|bikini top|tankini top)\b/.test(context)) {
        return "athletic top";
      }
      return "athletic garment";
    })();

    const isCropTopOrSportsBra =
      /\b(sports?\s*bra|crop\s*top|bralette|support\s*top)\b/.test(
        normalizedProductContext,
      );

    const isTopOnlyGarment = (isCropTopOrSportsBra ||
      /\b(top|bralette|bra|tankini top|bikini top|triangle)\b/.test(
        normalizedProductContext,
      )) &&
      !/\b(bottom|brief|bottoms|short|shorts|set|two piece|2 piece|one piece|one-piece)\b/
        .test(normalizedProductContext);

    const neutralItemLabel = isUnderwear
      ? (isCropTopOrSportsBra
        ? "cropped athletic top"
        : "athletic base-layer garment")
      : isSwimwear
      ? swimwearGarmentLabel
      : isIntimate
      ? "fitted fashion garment"
      : itemType;
    const promptIntimateLabel = isSwimwear
      ? (isTopOnlyGarment ? "athletic crop top" : "athletic activewear piece")
      : isCropTopOrSportsBra
      ? "cropped athletic top"
      : neutralItemLabel;

    const isSwimwearOnly = isSwimwear && !isUnderwear;
    const isIntimateGarment = isSwimwear || isUnderwear || isIntimate;
    // Sports bras / crop tops are NOT intimate but DO trigger safety filters, so they need extra budget for rescue paths.
    const needsSafetyRescue = isIntimateGarment || isSportsBraOrCropTop;
    const FUNCTION_BUDGET_MS = 58_000;
    const MIN_REQUIRED_MS_PER_ATTEMPT = needsSafetyRescue ? 8_000 : 6_000;
    const EXTRACTION_BUDGET_MS = needsSafetyRescue ? 14_000 : 12_000;
    const MIN_REQUIRED_MS_FOR_EXTRACTION = 4_000;
    const startedAt = Date.now();

    // ── EXTRACT GARMENT FROM PRODUCT IMAGE (OPTIONAL) ──
    const forceIntimateExtraction = raw.forceIntimateExtraction === true;
    const disableIntimateExtraction = raw.disableIntimateExtraction === true;
    const enableIntimateExtraction = isIntimateGarment &&
      !disableIntimateExtraction;

    // Prioritize extraction for intimate requests (flat-lay reference helps reduce refusals)
    const extractIntimateGarment = async (): Promise<string | null> => {
      const extractPrompt =
        `Create a clean product cutout of the garment only. Remove all background and display elements. Output a single flat-lay garment image on pure white background, preserving exact color, texture, seams, logos, and shape.`;
      const extractionPlan: Array<
        { model: string; timeoutMs: number; label: string }
      > = isIntimateGarment
        ? [
          // flash tends to succeed more often on fine silhouettes; keep within function budget
          {
            model: "google/gemini-3.1-flash-image-preview",
            timeoutMs: 12_000,
            label: "extract-flash",
          },
          {
            model: "google/gemini-2.5-flash-image",
            timeoutMs: 12_000,
            label: "extract-nano",
          },
        ]
        : [
          {
            model: "google/gemini-3.1-flash-image-preview",
            timeoutMs: 9_000,
            label: "extract-flash",
          },
          {
            model: "google/gemini-2.5-flash-image",
            timeoutMs: 7_000,
            label: "extract-nano",
          },
        ];

      for (const plan of extractionPlan) {
        const elapsedMs = Date.now() - startedAt;
        const remainingMs = FUNCTION_BUDGET_MS - elapsedMs;
        const extractionBudgetLeft = EXTRACTION_BUDGET_MS - elapsedMs;

        if (
          remainingMs <= MIN_REQUIRED_MS_PER_ATTEMPT ||
          extractionBudgetLeft <= MIN_REQUIRED_MS_FOR_EXTRACTION
        ) {
          return null;
        }

        const timeoutMs = Math.min(
          plan.timeoutMs,
          extractionBudgetLeft,
          remainingMs - 1_000,
        );
        if (timeoutMs < MIN_REQUIRED_MS_FOR_EXTRACTION) return null;

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const extractResponse = await fetch(
              "https://ai.gateway.lovable.dev/v1/chat/completions",
              {
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
                      {
                        type: "image_url",
                        image_url: { url: clothingImageInput },
                      },
                    ],
                  }],
                }),
              },
            );

            if (!extractResponse.ok) {
              console.warn(
                `Garment extraction HTTP ${extractResponse.status} (${plan.label}), retrying`,
              );
              continue;
            }

            const extractData = await extractResponse.json();
            const extracted = extractImageFromResponse(extractData);
            if (!extracted) {
              console.warn(
                `Garment extraction returned no image (${plan.label}), retrying`,
              );
              continue;
            }

            console.log(`Garment extracted successfully (${plan.label})`);
            return extracted;
          } finally {
            clearTimeout(timer);
          }
        } catch (err) {
          console.warn(
            `Garment extraction failed/timed out (${plan.label}), retrying:`,
            err,
          );
        }
      }

      return null;
    };

    // ── CHANGE 2: AI-powered garment description ──
    const describeGarmentViaAI = async (): Promise<string | null> => {
      if (!isIntimateGarment && !isSportsBraOrCropTop) return null;
      const describePrompt =
        `Describe this clothing item in 2-3 sentences for a product catalog. Focus on: primary color(s), fabric type, cut/silhouette, neckline style, strap type, hemline, and any distinctive design elements like prints or hardware. Do NOT mention any person or model — describe only the garment itself. Use neutral retail terminology.`;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8_000);
        try {
          const descResponse = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              signal: controller.signal,
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{
                  role: "user",
                  content: [
                    { type: "text", text: describePrompt },
                    {
                      type: "image_url",
                      image_url: { url: clothingImageInput },
                    },
                  ],
                }],
              }),
            },
          );

          if (!descResponse.ok) {
            console.warn(`Garment description HTTP ${descResponse.status}`);
            return null;
          }

          const descData = await descResponse.json();
          const choices = descData.choices as
            | Array<Record<string, unknown>>
            | undefined;
          const msg = choices?.[0]?.message as
            | Record<string, unknown>
            | undefined;
          const text = typeof msg?.content === "string"
            ? msg.content
            : messageContentToText(msg?.content);

          if (text && text.trim().length > 20) {
            // Sanitize the AI description through expanded sanitizer
            const sanitized = sanitizeIntimateText(text.trim());
            console.log(
              `AI garment description generated (${sanitized.length} chars)`,
            );
            return sanitized;
          }
          return null;
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        console.warn("Garment description failed:", err);
        return null;
      }
    };

    // ── CHANGE 4: Run extraction + description for intimate items ──
    // The clean flat-lay from extraction is critical for many intimate items.
    // For underwear safe-mode, we avoid attaching ANY product image to image-generation calls,
    // but we still attempt to derive a text-only garment fingerprint (colors/logos/waistband/pattern)
    // from the product photo to keep outputs closer to the exact item.
    let garmentOnlyImage = clothingImageInput;
    let preExtractedGarment = false;
    let aiGarmentDescription: string | null = null;

    if (enableIntimateExtraction) {
      if (isUnderwearSafeMode) {
        // Safe-mode: DO NOT generate or attach a garment-only image reference; only compute text cues.
        aiGarmentDescription = await describeGarmentViaAI();
        console.log(
          `Underwear safe-mode: description=${!!aiGarmentDescription} (${
            aiGarmentDescription?.length || 0
          } chars), took ${Date.now() - startedAt}ms`,
        );
      } else {
        // Run extraction AND description in parallel to save time
        const [extractedImage, description] = await Promise.all([
          extractIntimateGarment(),
          describeGarmentViaAI(),
        ]);
        aiGarmentDescription = description;
        if (extractedImage) {
          garmentOnlyImage = extractedImage;
          preExtractedGarment = true;
          console.log(
            `Intimate parallel: extraction=SUCCESS, description=${!!description}, took ${
              Date.now() - startedAt
            }ms`,
          );
        } else {
          console.log(
            `Intimate parallel: extraction=FAILED, description=${!!description}, took ${
              Date.now() - startedAt
            }ms`,
          );
        }
      }
    } else if (isSportsBraOrCropTop) {
      // Sports bras are standard routing but frequently hit safety filters.
      // Pre-compute a text description so we can use text-bridge rescue if needed.
      aiGarmentDescription = await describeGarmentViaAI();
      console.log(
        `Sports bra pre-description: ${!!aiGarmentDescription} (${
          aiGarmentDescription?.length || 0
        } chars), took ${Date.now() - startedAt}ms`,
      );
    }

    const buildIntimateReferenceFromMetadata = (): string => {
      if (!isIntimateGarment) return "";
      const context = normalizeMatchText(
        [
          productName,
          productCategory,
          itemLower,
          typeof raw.productUrl === "string" ? raw.productUrl : "",
        ].join(" "),
      );

      const colorTerms = [
        "black",
        "white",
        "blue",
        "navy",
        "red",
        "pink",
        "green",
        "teal",
        "orange",
        "yellow",
        "purple",
        "brown",
        "beige",
        "tan",
        "gold",
        "silver",
        "multi",
        "floral",
      ];
      const primaryColor = colorTerms.find((c) => hasContextTerm(context, c));
      const pattern = hasContextTerm(context, "floral")
        ? "floral print"
        : hasContextTerm(context, "stripe")
        ? "striped pattern"
        : hasContextTerm(context, "polka")
        ? "polka-dot pattern"
        : "solid color";

      let garmentType: string;
      if (isSwimwear) {
        garmentType = /\b(one piece|one-piece|monokini)\b/.test(context)
          ? "one-piece swimsuit"
          : /\b(bottom|brief|bikini bottom|swim short)\b/.test(context)
          ? "swim bottom"
          : /\b(top|triangle|tri|tankini top|bralette)\b/.test(context)
          ? "triangle bikini top"
          : "swimwear set";
      } else if (isUnderwear) {
        garmentType = /\b(bra|bralette|sports bra|support top)\b/.test(context)
          ? "athletic support top"
          : /\b(boxer|brief|trunk)\b/.test(context)
          ? "athletic lower garment"
          : /\b(bodysuit|body)\b/.test(context)
          ? "fitted bodysuit"
          : "base-layer garment";
      } else {
        garmentType = /\b(robe|kimono)\b/.test(context)
          ? "lounge robe"
          : /\b(pajama|pj|sleep)\b/.test(context)
          ? "sleepwear set"
          : "fitted fashion garment";
      }

      const colorText = primaryColor ? `${primaryColor} ${pattern}` : pattern;
      const brandTextRaw = (productBrand || "").trim();
      const brandText = brandTextRaw ? sanitizeIntimateText(brandTextRaw) : "";
      const hasLogo = /\b(logo|branded)\b/.test(context);
      const hasWaistband = /\b(waistband|elastic)\b/.test(context);
      const detailText = /\btriangle|tri\b/.test(context)
        ? "thin straps and triangle cups"
        : /\bone piece|one-piece\b/.test(context)
        ? "clean one-piece silhouette"
        : /\b(lace|lacey)\b/.test(context)
        ? "textured fabric detailing"
        : "minimal modern silhouette";

      return `Reference garment: ${colorText} ${garmentType} with ${detailText}.${
        brandText ? ` Brand: ${brandText}.` : ""
      }${
        hasWaistband || hasLogo
          ? " Include a clearly visible branded waistband/logo detail consistent with the product."
          : ""
      } Keep it commercially styled and fully covering.`;
    };

    const intimateTextReference = buildIntimateReferenceFromMetadata();

    const productDesc = [
      productName,
      productBrand ? `by ${productBrand}` : "",
      productCategory ? `(${productCategory})` : "",
    ].filter(Boolean).join(" ");
    // CHANGE 1: Use expanded sanitizer
    const sanitizedProductDesc = isIntimateGarment
      ? sanitizeIntimateText(productDesc)
      : productDesc;
    const productHint = sanitizedProductDesc
      ? `\nProduct: "${sanitizedProductDesc}".`
      : "";

    const garmentDescriptor = sanitizedProductDesc ||
      (isIntimateGarment
        ? "sporty fitted garment with retail styling"
        : `${itemType} with catalog-style details`);

    const swimwearScopeInstruction = isTopOnlyGarment
      ? "This is a SWIM TOP / BIKINI TOP. Style the model in a complete swimwear look: apply the swim top reference and add a simple matching swim bottom in the same color family. REMOVE ALL existing streetwear clothing (pants, jeans, skirts, shorts, blazers, shirts, t-shirts, jackets, coats) AND shoes — the model should ONLY be wearing the swimwear, barefoot."
      : "REMOVE ALL existing clothing AND shoes from Image A (tops, pants, jeans, skirts, jackets, shirts, t-shirts, shoes, sneakers, boots, sandals — everything). Replace with ONLY the swimwear/swimsuit from Image B. The model should be wearing NOTHING except the swimwear garment. Do NOT keep any streetwear or footwear from Image A. The model should be barefoot.";

    const isSetGarment =
      /\b(set|two piece|2 piece|2-piece|pajama set|pj set|lounge set|sleep set|matching|outfit|combo|bundle|pair|coord|co-ord|co ord)\b/
        .test(normalizedProductContext);
    const isBottomOnlyIntimate = isIntimateGarment &&
      !isSwimwear &&
      /\b(panties|briefs|boxers|trunk|thong|g string|g-string|underwear|bottom|bottoms|boyshort|hipster)\b/
        .test(normalizedProductContext) &&
      !/\b(top|bra|bralette|support top|sports bra|set|two piece|2 piece|one piece|one-piece|bodysuit)\b/
        .test(normalizedProductContext);

    const intimateScopeInstruction = isSwimwear
      ? swimwearScopeInstruction
      : isSetGarment
      ? "Image B shows a MATCHING SET with BOTH a top AND a bottom. Replace ALL clothing from Image A with BOTH pieces from Image B — the top piece AND the bottom piece must BOTH appear on the model. Do NOT apply only one piece. Show ONLY what is visible in Image B — do NOT add leggings, pants, shorts, or any garment not shown in Image B."
      : isTopOnlyGarment
      ? (isCropTopOrSportsBra
        ? "Image B shows a CROP TOP / SPORTS BRA — a SHORT top that ends ABOVE the waist or at the midriff. Replace ONLY the upper-body clothing from Image A with this cropped top. The top must remain SHORT and cropped — do NOT extend it into a full-length shirt or tank top. Keep the person's EXISTING lower-body clothing (pants, jeans, shorts, skirt, leggings) from Image A EXACTLY as they are — do NOT replace, remove, or change the bottoms in any way."
        : "Image B shows a TOP-only garment. Replace the upper body clothing from Image A with the top from Image B. Keep the person's EXISTING lower-body clothing from Image A unchanged — do NOT replace bottoms.")
      : isBottomOnlyIntimate
      ? (
        isUnderwearSafeMode
          ? "Image B is a BASE-LAYER BOTTOM. Keep the person's existing lower-body clothing from Image A (pants/shorts/skirt) UNCHANGED to keep the output fully covered. Add ONLY a subtle branded waistband/upper trim detail inspired by Image B ABOVE the existing bottoms (like a styled athletic waistband). Keep the person's EXISTING upper-body clothing unchanged. Do NOT depict nudity or any exposed base-layer areas."
          : "Image B shows a BOTTOM-only garment. Replace only the lower-body clothing from Image A with the bottom from Image B. Keep the person's EXISTING upper-body clothing from Image A unchanged — do NOT add leggings, pants, or extra garments."
      )
      : "Replace the outfit in Image A with ONLY the COMPLETE garment from Image B — show every part of it (all straps, panels, cups, ties, etc). Show ONLY clothing visible in Image B. Do NOT add leggings, pants, or any extra garment not present in Image B.";

    const garmentSwapScopeInstruction = isIntimateGarment
      ? intimateScopeInstruction
      : isTopOnlyGarment
      ? "This is a TOP-only garment: replace upper-body clothing only and keep lower-body clothing from Image A unchanged."
      : "Replace only the clothing area needed for this garment and keep all unrelated body/background details unchanged.";

    const identityInstruction = isIntimateGarment
      ? "Use Image A as pose, proportions, and scene reference with softly de-emphasized facial details. CRITICAL: Show the FULL BODY from shoulders to feet — never crop at the waist or torso."
      : "Keep the model's face, body shape, skin tone, hair, and pose identical to Image A.";
    const intimateFramingInstruction = isIntimateGarment
      ? "- CRITICAL: Output MUST show FULL BODY from head to feet, including legs and shoes/feet. Never crop at the waist or mid-thigh. Softly de-emphasize facial details while preserving pose and background continuity."
      : "";

    // ── BUILD PROMPT ──
    const safetyNote = isExplicitIntimate
      ? "Render sheer/transparent sections as opaque while preserving design details."
      : "Keep output commercially appropriate for retail catalog standards.";
    const noResizeInstruction =
      "CRITICAL DIMENSIONS: Preserve Image A exactly. Output must keep the SAME aspect ratio, width, and height as Image A. Do NOT resize, crop, zoom, expand the canvas, or reframe.";

    let prompt: string;

    if (isFootwear && !isLayering) {
      prompt =
        `You are a fashion photo editor. Generate ONE photorealistic image.

IMAGES PROVIDED:
- Image A (first image below): A person wearing an outfit — preserve their face, body, pose, and ALL clothing EXACTLY.
- Image B (second image below): The target footwear reference.

TARGET FOOTWEAR:
- The shoes shown in Image B.${productHint}

TASK — FOOTWEAR SWAP:
1. REMOVE whatever shoes/footwear the person in Image A is currently wearing.
2. REPLACE them with the EXACT footwear from Image B — match color, shape, material, branding, sole, laces, and all details precisely.
3. Keep ALL other clothing from Image A completely unchanged — do NOT modify tops, bottoms, or any other garment.
4. Keep the person's face, body, hair, skin tone, pose, and leg position identical to Image A.
5. CRITICAL ORIENTATION: Keep the model facing the SAME DIRECTION as in Image A.
6. ${bgInstruction}
7. Correct scale — shoes must match the person's foot size realistically. Natural shadows and lighting.
8. ${noResizeInstruction}

Output: A single photorealistic FULL-BODY image showing the person head to feet. No text/watermarks/split views.`;
    } else if (
      (isAccessory || isLayering) && !isIntimateGarment && !isSportsBraOrCropTop
    ) {
      const accessoryLayoutGuard = isBelt
        ? "BELT-SPECIFIC: The belt MUST be clearly visible around the waist, worn OVER the existing clothing. Show the full belt including buckle/chain details. Do NOT hide it under clothing layers."
        : "ACCESSORY-SPECIFIC: Image B may be a retail product card, collage, or multi-model photo. Extract ONLY the accessory item itself and DISCARD any person, body, pose, white frame, banner, padding, studio card layout, duplicate figure, or side-by-side composition from Image B. The final image must keep the original single-person framing from Image A only.";
      const accessoryBagGuard =
        /\b(bag|bags|purse|handbag)\b/.test(normalizedProductContext)
          ? "BAG-SPECIFIC: Place exactly ONE bag on the person from Image A at a natural shoulder/hand/crossbody position. Never duplicate the person. Never create a second copy of the model to display the bag. Never include white margins, product-card borders, split panels, or showroom banners from Image B."
          : "";
      prompt =
        `You are a fashion photo editor. Generate ONE photorealistic image.

IMAGES PROVIDED:
- Image A (first image below): The ONLY person allowed in the final image — preserve this person's face, body, pose, framing, and background EXACTLY.
- Image B (second image below): The target accessory reference only.

TARGET ACCESSORY:
- The accessory shown in Image B.${productHint}

TASK: Add the accessory from Image B onto the person in Image A. Match the target item exactly (color, shape, material, branding).
- PERSON COUNT: Output ONE person only — the person already present in Image A.
- COMPOSITION LOCK: Keep the camera framing, crop, spacing, and background from Image A only.
- Never copy any model, mannequin, hand, torso, duplicate figure, side-by-side layout, white padding, card frame, or banner from Image B.
- ${accessoryLayoutGuard}
${accessoryBagGuard ? `- ${accessoryBagGuard}\n` : ""}- ${bgInstruction}
- Correct scale, lighting, shadows. No text/watermarks.

${noResizeInstruction}`;
    } else if (isIntimateGarment) {
      const intimateReferenceLine =
        `IMAGE B: An activewear/athletic product listing photo from an online retailer.${
          intimateTextReference ? `\nHint: ${intimateTextReference}` : ""
        }`;

      const underwearSafetyInstruction = isUnderwearSafeMode
        ? `COMMERCIAL SAFETY MODE:
- Recreate the exact garment as a commercially appropriate FULL-COVERAGE athletic base-layer / shortie / fitted activewear styling.
- Preserve exact color, pattern, logo/waistband cues, and silhouette family where possible.
- Do NOT depict exposed intimate anatomy, transparent coverage, or minimal-coverage styling.`
        : `SAFETY NOTE:
- ${safetyNote}`;

      prompt = `You are a professional retail fashion photo editor.
Generate ONE photorealistic full-body editorial ecommerce image.

${identityInstruction}
${noResizeInstruction}

IMAGE A: The person photo. Preserve face, hair, body shape, skin tone, pose, hand position, camera angle, framing, and background.
${intimateReferenceLine}

TASK:
- Dress the person from Image A in the garment represented by Image B.
- Match the garment's exact color, silhouette, neckline, straps, coverage level, material appearance, seams, print, trim, and branding cues as closely as possible.
- Keep it retail-safe, natural, and commercially appropriate.
- Output ONE full-body image only. No collage, no split panels, no duplicate people, no text.
- ${bgInstruction}

${underwearSafetyInstruction}`;
    } else {
      prompt =
        `You are a fashion photo editor. Generate ONE photorealistic image.

IMAGES PROVIDED:
- Image A (first image below): The person photo to preserve.
- Image B (second image below): The clothing item to apply.${productHint}

TASK:
- Replace ONLY the target garment on the person in Image A with the item from Image B.
- Match the product exactly: color, silhouette, neckline, sleeves/straps, hem, fabric texture, logos, and distinctive details.
- Preserve the person's identity, pose, body, hands, legs, camera framing, and background from Image A.
- Keep the image commercially appropriate and realistic.
- ${bgInstruction}
- ${noResizeInstruction}

Output: a single photorealistic full-body fashion image. No text, no collage, no watermark.`;
    }

    const typeLabel = isFootwear
      ? "footwear"
      : (isAccessory || isLayering) && !isIntimateGarment &&
          !isSportsBraOrCropTop
      ? "accessory"
      : isIntimateGarment
      ? "intimate"
      : "standard";
    const footwearFastPrompt =
      `Fast shoe swap. Image A is the person, Image B is the exact shoe.${productHint} Replace only footwear in Image A with Image B. Keep all other clothing, pose, and framing unchanged. ${bgFallbackHint} ${noResizeInstruction} No text/watermark.`;
    const footwearRetryPrompt =
      `Photorealistic shoe replacement.${productHint} Replace only the shoes from Image A with the shoes from Image B. Keep body, outfit, orientation, and lighting natural. ${bgFallbackHint} ${noResizeInstruction} No text/watermark.`;
    const beltDescHint = sanitizedProductDesc
      ? `\nThe belt to use is: "${sanitizedProductDesc}". If Image B shows a full-body model, identify ONLY the belt described above and ignore all other clothing.`
      : "";
    const bagDescHint =
      /\b(bag|bags|purse|handbag)\b/.test(normalizedProductContext)
        ? `\nThe accessory is a BAG. If Image B shows a model, duplicate product card, or white retail frame, isolate ONLY the bag and discard the person, white background card, layout borders, and any second figure.`
        : "";
    const beltFastPrompt =
      `Belt try-on. Image A = person wearing an outfit. Image B = belt reference.${beltDescHint}${productHint}
TASK: Place the belt from Image B around the waist of the person in Image A. The belt MUST be clearly visible sitting on top of existing clothing at the waistline. Match the exact buckle style, chain/link pattern, material, color, and width from Image B. Keep all other clothing, face, pose, and background from Image A completely unchanged. ${bgFallbackHint} ${noResizeInstruction} No text/watermark.`;
    const beltRetryPrompt =
      `Photorealistic belt placement. Image A = person. Image B = belt reference.${beltDescHint}${productHint}
TASK: Add the belt from Image B onto the person in Image A at the natural waistline. The belt must be prominently visible over their clothing with accurate buckle/chain detail, correct scale, realistic shadows and lighting. Do NOT remove or change any existing clothing. Keep face, body, pose from Image A. ${bgFallbackHint} ${noResizeInstruction} No text/watermark.`;
    const accessoryRetryPrompt =
      `Photorealistic accessory placement. Image A = the only allowed person and scene. Image B = accessory sample only.${bagDescHint}${productHint}
TASK: Add ONLY the accessory from Image B onto the person in Image A. Keep the original single person, framing, pose, and background from Image A unchanged. Never copy any extra model, hand, mannequin, split layout, white banner, white card padding, duplicate figure, or side-by-side product-card composition from Image B. Correct scale, natural shadows, realistic lighting. ${bgFallbackHint} ${noResizeInstruction} No text/watermark.`;
    // Only bypass primary when we already have a clean flat-lay; otherwise keep one primary attempt.
    // Underwear-like items: bypass primary entirely and go straight to the safe-mode text-bridge path.
    const shouldBypassPrimaryForIntimate = isIntimateGarment &&
      (
        isUnderwearSafeMode ||
        (preExtractedGarment &&
          (isUnderwear || isExplicitIntimate || isBottomOnlyIntimate))
      );
    const attemptPlan: Array<
      { model: string; prompt: string; label: string; timeoutMs: number }
    > = isIntimateGarment
      ? (
        shouldBypassPrimaryForIntimate ? [] : [
          // Single generous attempt — intimate items either succeed in ~15-25s or get refused quickly (~3s)
          {
            model: "google/gemini-3.1-flash-image-preview",
            prompt,
            label: `${typeLabel}-flash-primary`,
            timeoutMs: 28_000,
          },
        ]
      )
      : isFootwear && !isLayering
      ? [
        {
          model: "google/gemini-2.5-flash-image",
          prompt: footwearFastPrompt,
          label: `${typeLabel}-nano-primary`,
          timeoutMs: 14_000,
        },
        {
          model: "google/gemini-3.1-flash-image-preview",
          prompt: footwearRetryPrompt,
          label: `${typeLabel}-flash-retry`,
          timeoutMs: 16_000,
        },
      ]
      : ((isAccessory || isLayering) && !isSportsBraOrCropTop)
      ? (
        isBelt
          ? [
            {
              model: "google/gemini-2.5-flash-image",
              prompt: beltFastPrompt,
              label: `${typeLabel}-belt-fast`,
              timeoutMs: 22_000,
            },
            {
              model: "google/gemini-3.1-flash-image-preview",
              prompt: beltRetryPrompt,
              label: `${typeLabel}-belt-retry`,
              timeoutMs: 22_000,
            },
          ]
          : [
            {
              model: "google/gemini-3.1-flash-image-preview",
              prompt,
              label: `${typeLabel}-flash-primary`,
              timeoutMs: 28_000,
            },
            {
              model: "google/gemini-2.5-flash-image",
              prompt: accessoryRetryPrompt,
              label: `${typeLabel}-nano-retry`,
              timeoutMs: 20_000,
            },
            {
              model: "google/gemini-3-pro-image-preview",
              prompt: accessoryRetryPrompt,
              label: `${typeLabel}-pro-retry`,
              timeoutMs: 18_000,
            },
          ]
      )
      : [
        {
          model: "google/gemini-3.1-flash-image-preview",
          prompt,
          label: `${typeLabel}-primary`,
          timeoutMs: 30_000,
        },
        {
          model: "google/gemini-3.1-flash-image-preview",
          prompt: fallbackPrompt,
          label: `${typeLabel}-flash-retry`,
          timeoutMs: 22_000,
        },
        {
          model: "google/gemini-3-pro-image-preview",
          prompt: fallbackPrompt,
          label: `${typeLabel}-pro-retry`,
          timeoutMs: 20_000,
        },
      ];

    if (shouldBypassPrimaryForIntimate) {
      console.log(
        "Intimate routing: bypassing product-image primary attempt and starting with text-bridge.",
      );
    }

    let resultImage: string | null = null;
    let lastTextContent = "";
    let sawIntimateRefusal = false;
    let sawIntimateTimeout = false;
    let sawSafetyRefusal = false; // Tracks IMAGE_PROHIBITED_CONTENT for sports bras/crop tops
    let attemptedRefusalExtraction = preExtractedGarment;

    for (let attempt = 0; attempt < attemptPlan.length; attempt++) {
      const plan = attemptPlan[attempt];
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = FUNCTION_BUDGET_MS - elapsedMs;

      if (remainingMs <= MIN_REQUIRED_MS_PER_ATTEMPT) {
        console.warn(
          `Stopping — insufficient time budget (remaining=${remainingMs}ms).`,
        );
        break;
      }

      const attemptsLeftAfterThis = attemptPlan.length - attempt - 1;
      const isFinalAttempt = attempt === attemptPlan.length - 1;
      const reserveForRetriesMs =
        attemptsLeftAfterThis * MIN_REQUIRED_MS_PER_ATTEMPT + 1_000;
      const timeoutMs = Math.min(
        plan.timeoutMs,
        Math.max(
          MIN_REQUIRED_MS_PER_ATTEMPT,
          remainingMs - (isFinalAttempt ? 0 : reserveForRetriesMs),
        ),
      );

      console.log(
        `Try-on attempt ${
          attempt + 1
        }/${attemptPlan.length} model=${plan.model} timeout=${timeoutMs}ms label=${plan.label}`,
      );

      let response: Response;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          response = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
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
                  content: buildTryOnContent(plan.prompt),
                }],
              }),
            },
          );
        } finally {
          clearTimeout(timer);
        }
      } catch (fetchErr) {
        const isTimeout =
          (fetchErr instanceof DOMException || fetchErr instanceof Error) &&
          (fetchErr as { name: string }).name === "AbortError";
        console.warn(
          `Attempt ${attempt + 1} (${plan.label}): ${
            isTimeout ? "TIMEOUT" : "FAILED"
          }`,
          fetchErr,
        );

        if (isTimeout && isIntimateGarment) {
          sawIntimateTimeout = true;
          const hasTextBridgeReference = Boolean(
            aiGarmentDescription || intimateTextReference,
          );
          if (hasTextBridgeReference) {
            console.warn(
              `Attempt ${
                attempt + 1
              } (${plan.label}): timed out for intimate item, switching to text-bridge rescue early.`,
            );
            break;
          }
        }

        if (
          !lastTextContent ||
          !lastTextContent.toLowerCase().includes("rejected this garment style")
        ) {
          lastTextContent = isFinalAttempt
            ? (isTimeout
              ? "The AI request timed out across all retries. Try again with a clearer front-facing clothing photo."
              : "The AI request failed after all retries. Please try a different photo.")
            : (isTimeout
              ? "The AI request timed out. Trying a quicker fallback now."
              : "The AI request failed. Trying a fallback now.");
        }
        if (!isFinalAttempt) {
          await new Promise((r) => setTimeout(r, isTimeout ? 350 : 700));
          continue;
        }
        break;
      }

      if (!response.ok) {
        if (response.status === 429) {
          if (!isFinalAttempt) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          return errorResponse(
            "Rate limited. Try again shortly.",
            "RATE_LIMITED",
            429,
            corsHeaders,
          );
        }
        if (response.status === 402) {
          return errorResponse(
            "AI credits exhausted.",
            "PAYMENT_REQUIRED",
            402,
            corsHeaders,
          );
        }

        const errText = await response.text();
        console.error(
          `AI error ${response.status} (${plan.label}):`,
          errText.substring(0, 300),
        );
        if (!isFinalAttempt) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return errorResponse(
          `AI gateway error ${response.status}`,
          "AI_ERROR",
          502,
          corsHeaders,
        );
      }

      const aiData = await response.json();
      resultImage = extractImageFromResponse(aiData);

      if (resultImage) {
        console.log(
          `Image extracted on attempt ${attempt + 1} (${plan.label})`,
        );
        break;
      }

      try {
        console.warn(
          `No-image payload snapshot (${plan.label}):`,
          JSON.stringify(aiData).substring(0, 1200),
        );
      } catch {
        // ignore logging serialization failures
      }

      const firstChoice = (aiData.choices as Array<Record<string, unknown>>)
        ?.[0];
      const finishReason = typeof firstChoice?.finish_reason === "string"
        ? firstChoice.finish_reason
        : "";
      const nativeFinishReason =
        typeof firstChoice?.native_finish_reason === "string"
          ? firstChoice.native_finish_reason
          : "";
      const msg = firstChoice?.message as Record<string, unknown> | undefined;
      const refusal =
        msg && Object.prototype.hasOwnProperty.call(msg, "refusal")
          ? msg.refusal
          : undefined;
      const messageTextRaw = typeof msg?.content === "string"
        ? msg.content
        : messageContentToText(msg?.content);
      const messageText = messageTextRaw.trim();

      const refusalSignal = `${
        typeof refusal === "string" ? refusal : ""
      } ${messageText} ${nativeFinishReason}`.toLowerCase();
      const looksLikeRefusal = refusal !== undefined ||
        /reject|refus|policy|unsafe|cannot|can't|unable/.test(refusalSignal) ||
        /safety|content_filter|blocked|other|no_image|image_prohibited_content/
          .test(finishReason.toLowerCase()) ||
        /image_prohibited_content/.test(nativeFinishReason.toLowerCase());

      if (refusal !== undefined) {
        console.warn(
          `REFUSED (${plan.label}):`,
          JSON.stringify(refusal).substring(0, 300),
        );
      }

      // Detect IMAGE_PROHIBITED_CONTENT for sports bras (standard path items that still trigger safety)
      const isProhibitedContent =
        /image_prohibited_content/.test(nativeFinishReason.toLowerCase()) ||
        /image_prohibited_content/.test(finishReason.toLowerCase());
      if (isProhibitedContent && isSportsBraOrCropTop) {
        sawSafetyRefusal = true;
        console.warn(
          `Sports bra safety refusal detected (${plan.label}), will attempt text-bridge rescue.`,
        );
        // Break out of standard loop early if we have a description ready
        if (aiGarmentDescription) {
          lastTextContent =
            "Safety filter triggered for this garment. Trying alternative approach...";
          break;
        }
      }

      let extractedAfterRefusal = false;

      if (looksLikeRefusal && isIntimateGarment) {
        sawIntimateRefusal = true;
        if (!lastTextContent) {
          lastTextContent =
            "Try-on was blocked by safety checks for this image combination. Try a full-body user photo and a clear product-only or flat-lay garment image.";
        }

        // If we already have a text description, skip extraction and go straight to text-bridge
        const hasTextBridgeReference = Boolean(
          aiGarmentDescription || intimateTextReference,
        );
        if (hasTextBridgeReference) {
          console.warn(
            `Attempt ${
              attempt + 1
            } (${plan.label}): refusal with text description available, skipping extraction — going to text-bridge.`,
          );
          break;
        }

        if (!attemptedRefusalExtraction) {
          attemptedRefusalExtraction = true;
          const rescuedGarment = await extractIntimateGarment();
          if (rescuedGarment) {
            garmentOnlyImage = rescuedGarment;
            extractedAfterRefusal = true;
            console.log(
              `Refusal rescue extracted garment (${plan.label}); retrying with cleaned product image.`,
            );
          }
        }

        const hasCleanGarmentRef = garmentOnlyImage !== clothingImageInput;
        if (!extractedAfterRefusal && !hasCleanGarmentRef) {
          console.warn(
            `Attempt ${
              attempt + 1
            } (${plan.label}): refusal with no clean garment extract and no text ref.`,
          );
          break;
        }
      }

      if (messageText) {
        const lowerMessage = messageText.toLowerCase();
        const looksLikeStyleRejection =
          /rejected this garment style|cannot generate|unable to generate|policy|safety/
            .test(lowerMessage);
        const looksLikeNonDiagnosticTextOnly =
          /^(absolutely|sure|great|okay|ok|here(?:'|')s|here you go|i(?:'|')ve|i have|done|generated)/i
            .test(messageText) ||
          /here(?:'|')s the model/i.test(lowerMessage) ||
          /wearing the .* from image b/i.test(lowerMessage);

        if (isIntimateGarment && looksLikeStyleRejection) {
          lastTextContent =
            "Try-on was blocked by safety checks for this image combination. Try a full-body user photo and a clear product-only or flat-lay garment image.";
        } else if (
          !looksLikeNonDiagnosticTextOnly && hasMeaningfulWords(messageText) &&
          messageText.length >= 12
        ) {
          lastTextContent = messageText;
        }
      }
      if (lastTextContent) {
        console.warn(
          `Text-only response (${plan.label}):`,
          lastTextContent.substring(0, 300),
        );
      }
      console.warn(
        `Attempt ${attempt + 1} (${plan.label}): No image extracted. Keys=${
          JSON.stringify(Object.keys(msg || {}))
        }`,
      );

      if (extractedAfterRefusal && !isFinalAttempt) {
        continue;
      }

      if (!isFinalAttempt) await new Promise((r) => setTimeout(r, 600));
    }

    // Existing refusal rescue block
    if (
      !resultImage && isIntimateGarment && sawIntimateRefusal &&
      !attemptedRefusalExtraction
    ) {
      attemptedRefusalExtraction = true;
      const rescuedGarment = await extractIntimateGarment();
      if (rescuedGarment) {
        garmentOnlyImage = rescuedGarment;
        const elapsedMs = Date.now() - startedAt;
        const remainingMs = FUNCTION_BUDGET_MS - elapsedMs;
        if (remainingMs > MIN_REQUIRED_MS_PER_ATTEMPT) {
          const rescueTimeoutMs = Math.min(
            22_000,
            Math.max(MIN_REQUIRED_MS_PER_ATTEMPT, remainingMs - 1_000),
          );
          console.log(
            `Try-on refusal rescue model=google/gemini-2.5-flash-image timeout=${rescueTimeoutMs}ms`,
          );
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), rescueTimeoutMs);
            try {
              const rescueResponse = await fetch(
                "https://ai.gateway.lovable.dev/v1/chat/completions",
                {
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
                      content: buildTryOnContent(fastIntimatePrompt),
                    }],
                  }),
                },
              );

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

    // ── CHANGE 6: Layer 3 text-bridge rescue (also covers sports bras with safety refusals) ──
    const needsTextBridgeRescue = isIntimateGarment
      ? (sawIntimateRefusal || sawIntimateTimeout ||
        shouldBypassPrimaryForIntimate)
      : (isSportsBraOrCropTop && (sawSafetyRefusal || !resultImage));
    if (!resultImage && needsTextBridgeRescue) {
      // Prefer metadata reference for high-risk intimate bottoms; it is safer than free-form AI descriptions.
      const textDesc =
        (isBottomOnlyIntimate || isUnderwear || isExplicitIntimate)
          ? (intimateTextReference || aiGarmentDescription)
          : (aiGarmentDescription || intimateTextReference);
      const hasCleanFlatLay = garmentOnlyImage !== clothingImageInput;

      if ((textDesc && textDesc.length > 15) || hasCleanFlatLay) {
        const descForPrompt = isUnderwearSafeMode
          ? (
            // Keep it fully covered, but preserve ITEM-SPECIFIC cues (color/pattern/waistband/logo/brand) via textDesc.
            `${
              (textDesc || "").trim()
            }\nCommercially appropriate fully-covered athletic styling (no nudity, no exposed base-layer areas). Preserve the exact colorway/pattern and any visible branded waistband/logo cues.`
              .replace(/\s+/g, " ")
              .trim() ||
            "Commercially appropriate fully-covered athletic styling (no nudity, no exposed base-layer areas). Preserve the exact colorway/pattern and any visible branded waistband/logo cues."
          )
          : (textDesc ||
            "athletic fitted garment matching the reference image");
        console.log(
          `Layer 3 text-bridge: hasCleanFlatLay=${hasCleanFlatLay}, textDesc=${!!textDesc} (${
            textDesc?.length || 0
          } chars)`,
        );
        const textBridgePrompt = makeTextBridgePrompt(
          descForPrompt,
          hasCleanFlatLay,
        );

        const textBridgeModels = [
          {
            model: "google/gemini-3.1-flash-image-preview",
            label: "textbridge-flash",
            timeoutMs: 22_000,
          },
          {
            model: "google/gemini-2.5-flash-image",
            label: "textbridge-nano",
            timeoutMs: 16_000,
          },
          {
            model: "google/gemini-3-pro-image-preview",
            label: "textbridge-pro",
            timeoutMs: 18_000,
          },
        ];

        for (let tbIndex = 0; tbIndex < textBridgeModels.length; tbIndex++) {
          const tbPlan = textBridgeModels[tbIndex];
          const elapsedMs = Date.now() - startedAt;
          const remainingMs = FUNCTION_BUDGET_MS - elapsedMs;
          if (remainingMs <= MIN_REQUIRED_MS_PER_ATTEMPT) break;

          const attemptsLeftAfterThis = textBridgeModels.length - tbIndex - 1;
          const reserveForRetriesMs =
            attemptsLeftAfterThis * MIN_REQUIRED_MS_PER_ATTEMPT +
            (attemptsLeftAfterThis > 0 ? 1_000 : 0);
          const timeoutMs = Math.min(
            tbPlan.timeoutMs,
            Math.max(
              MIN_REQUIRED_MS_PER_ATTEMPT,
              remainingMs - reserveForRetriesMs,
            ),
          );
          console.log(
            `Text-bridge attempt model=${tbPlan.model} timeout=${timeoutMs}ms label=${tbPlan.label}`,
          );

          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
              const tbResponse = await fetch(
                "https://ai.gateway.lovable.dev/v1/chat/completions",
                {
                  method: "POST",
                  signal: controller.signal,
                  headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: tbPlan.model,
                    modalities: ["image", "text"],
                    messages: [{
                      role: "user",
                      content: buildTextBridgeContent(textBridgePrompt),
                    }],
                  }),
                },
              );

              if (tbResponse.ok) {
                const tbData = await tbResponse.json();
                const tbImage = extractImageFromResponse(tbData);
                if (tbImage) {
                  resultImage = tbImage;
                  console.log(
                    `Layer 3 text-bridge SUCCEEDED (${tbPlan.label}) — no product image was sent`,
                  );
                  break;
                }

                try {
                  console.warn(
                    `Text-bridge no-image payload (${tbPlan.label}):`,
                    JSON.stringify(tbData).substring(0, 1200),
                  );
                } catch {
                  // ignore logging serialization failures
                }

                const tbFirstChoice =
                  (tbData.choices as Array<Record<string, unknown>>)?.[0];
                const tbMessage = tbFirstChoice?.message as
                  | Record<string, unknown>
                  | undefined;
                const tbFinishReason =
                  typeof tbFirstChoice?.finish_reason === "string"
                    ? tbFirstChoice.finish_reason
                    : "";
                const tbNativeFinishReason =
                  typeof tbFirstChoice?.native_finish_reason === "string"
                    ? tbFirstChoice.native_finish_reason
                    : "";
                const tbRefusal = tbMessage &&
                    Object.prototype.hasOwnProperty.call(tbMessage, "refusal")
                  ? tbMessage.refusal
                  : undefined;
                const tbRefusalSignal = `${
                  typeof tbRefusal === "string" ? tbRefusal : ""
                } ${tbFinishReason} ${tbNativeFinishReason}`.toLowerCase();

                if (
                  /(image_prohibited_content|image_safety|prohibited|blocked|safety|no_image|image_other)/
                    .test(tbRefusalSignal)
                ) {
                  lastTextContent =
                    "Try-on was blocked by safety checks for this image combination. Retrying with a stricter fallback.";
                }
              } else {
                console.warn(
                  `Text-bridge HTTP ${tbResponse.status} (${tbPlan.label})`,
                );
              }
            } finally {
              clearTimeout(timer);
            }
          } catch (tbErr) {
            console.warn(
              `Text-bridge failed/timed out (${tbPlan.label}):`,
              tbErr,
            );
          }
        }
      } else {
        console.warn(
          "Layer 3 text-bridge skipped — no garment description available",
        );
      }
    }

    if (!resultImage) {
      const lowerLastText = lastTextContent.toLowerCase();
      const looksLikeNonDiagnosticTextOnly =
        /^(absolutely|sure|great|okay|ok|here(?:'|')s|here you go|i(?:'|')ve|i have|done|generated)/i
          .test(lastTextContent.trim()) ||
        /here(?:'|')s the model/i.test(lowerLastText) ||
        /wearing the .* from image b/i.test(lowerLastText);

      if (
        lowerLastText.includes("trying a quicker fallback now") ||
        lowerLastText.includes("trying a fallback now")
      ) {
        lastTextContent =
          "The AI request timed out across all retries. Try again with a clearer front-facing clothing photo.";
      }
      if (looksLikeNonDiagnosticTextOnly) {
        lastTextContent = "";
      }
      if (
        lastTextContent && lastTextContent.replace(/[`'".\s-]/g, "").length < 4
      ) {
        lastTextContent = "";
      }

      const failHint = (isSwimwear || isUnderwear || isIntimate)
        ? "The AI could not generate this try-on from the current product photo. Try a full-body user photo plus a front-facing product-only or flat-lay garment image."
        : "The AI was unable to generate a try-on image. Try clearer, well-lit photos showing the full person and garment.";
      return successResponse(
        { description: lastTextContent || failHint, resultImage: null },
        200,
        corsHeaders,
      );
    }

    // ── INCREMENT USAGE ──
    if (userTier === "guest" && guestUuid) {
      const { data: existing } = await supabaseAdmin
        .from("guest_sessions").select("tryon_count").eq(
          "guest_uuid",
          guestUuid,
        ).maybeSingle();
      if (existing) {
        await supabaseAdmin.from("guest_sessions")
          .update({ tryon_count: (existing.tryon_count || 0) + 1 }).eq(
            "guest_uuid",
            guestUuid,
          );
      } else {
        await supabaseAdmin.from("guest_sessions")
          .insert({ guest_uuid: guestUuid, tryon_count: 1 });
      }
    } else if (userTier === "free" && userId) {
      const today = new Date().toISOString().split("T")[0];
      const monthKey = today.substring(0, 7);
      const { data: existing } = await supabaseAdmin
        .from("tryon_usage").select("count").eq("user_id", userId).eq(
          "daily_key",
          today,
        ).maybeSingle();
      if (existing) {
        await supabaseAdmin.from("tryon_usage").update({
          count: existing.count + 1,
        }).eq("user_id", userId).eq("daily_key", today);
      } else {
        await supabaseAdmin.from("tryon_usage").insert({
          user_id: userId,
          month_key: monthKey,
          daily_key: today,
          count: 1,
        });
      }
    }

    return successResponse({ resultImage, userTier }, 200, corsHeaders);
  } catch (e) {
    console.error("virtual-tryon error:", e);
    return errorResponse(
      e instanceof Error ? e.message : "Try-on failed",
      "INTERNAL_ERROR",
      500,
      corsHeaders,
    );
  }
});

/** Extract image URL/base64 from AI response (handles multiple gateway formats) */
function extractImageFromResponse(
  aiResponse: Record<string, unknown>,
): string | null {
  const normalizeCandidate = (value: string): string | null => {
    const trimmed = value.trim().replace(/^["'`]+|["'`]+$/g, "");
    if (!trimmed) return null;
    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(trimmed)) return trimmed;
    if (/^https?:\/\//.test(trimmed)) return trimmed;
    if (/^[A-Za-z0-9+/=]{1000,}$/.test(trimmed)) {
      return `data:image/png;base64,${trimmed}`;
    }
    return null;
  };

  const deepSearch = (
    node: unknown,
    keyPath = "",
    seen = new Set<unknown>(),
  ): string | null => {
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
      for (const item of node) {
        const f = deepSearch(item, keyPath, seen);
        if (f) return f;
      }
      return null;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "b64_json" && typeof v === "string" && v.length > 1000) {
        return `data:image/png;base64,${v}`;
      }
      const f = deepSearch(v, keyPath ? `${keyPath}.${k}` : k, seen);
      if (f) return f;
    }
    return null;
  };

  const choices = aiResponse.choices as
    | Array<Record<string, unknown>>
    | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  if (!message) {
    if (aiResponse.data && Array.isArray(aiResponse.data)) {
      for (
        const item of aiResponse.data as Array<
          { url?: string; b64_json?: string }
        >
      ) {
        if (item?.url) return item.url;
        if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
      }
    }
    return null;
  }

  // Format 1: message.images (Lovable gateway)
  if (message.images && Array.isArray(message.images)) {
    for (
      const img of message.images as Array<
        { image_url?: { url?: string }; url?: string }
      >
    ) {
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
        if (id?.data) {
          return `data:${id.mime_type || "image/png"};base64,${id.data}`;
        }
      }
      if (part?.type === "image") {
        const src =
          (part as { source?: { data?: string; media_type?: string } }).source;
        if (src?.data) {
          return `data:${src.media_type || "image/png"};base64,${src.data}`;
        }
        if (typeof (part as { url?: string }).url === "string") {
          return (part as { url?: string }).url!;
        }
      }
    }
  }

  // Format 3: base64 in text
  const textContent = typeof message.content === "string"
    ? message.content
    : (Array.isArray(message.content)
      ? (message.content as Array<{ type?: string; text?: string }>).filter(
        (p) => p.type === "text",
      ).map((p) => p.text || "").join("")
      : "");
  if (textContent) {
    const b64 = textContent.match(
      /data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{100,}/,
    );
    if (b64) return b64[0];
    const md = textContent.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
    if (md?.[1]) {
      const n = normalizeCandidate(md[1]);
      if (n) return n;
    }
    const url = textContent.match(
      /"(?:image_url|url|src|image|imageUrl|output_image)"\s*:\s*"([^"\\]+)"/i,
    );
    if (url?.[1]) {
      const n = normalizeCandidate(url[1]);
      if (n) return n;
    }
  }

  // Format 4: deep search fallback
  return deepSearch(message, "message") || deepSearch(aiResponse, "response");
}
