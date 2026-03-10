import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AnalyzeBodySchema, parseOrError, successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";


const REFERENCE_SIZES: Record<string, string> = {
  credit_card: "a standard credit card (85.6 × 53.98 mm)",
  a4_paper: "an A4 sheet of paper (210 × 297 mm)",
  phone: "a standard smartphone (~150 mm tall)",
  none: "no reference object",
};

function buildSystemPrompt(heightCm: number, referenceObject: string, fitPreference: string): string {
  const refDesc = REFERENCE_SIZES[referenceObject] || REFERENCE_SIZES["none"];

  return `You are an expert body estimation AI. You will receive 2 photos of a person:
1. Front-facing full-body view
2. Side view

The person's actual height is ${heightCm} cm. Use this as the primary scale reference.
${referenceObject !== "none" ? `A reference object (${refDesc}) may be visible for additional calibration.` : ""}

Your task:
1. Use the known height (${heightCm} cm) to establish pixel-to-cm scale.
2. IDENTIFY body landmarks: shoulders, bust/chest, waist, hip, crotch/inseam, wrist, top of head, floor.
3. ESTIMATE measurement RANGES in centimeters (provide min and max for each):
   - shoulder: shoulder tip to shoulder tip
   - chest: circumference estimate (front width × π/2 + side depth × π/2)
   - bust: circumference at fullest part of bust (for women; for men set equal to chest)
   - waist: circumference at natural waist
   - hips: circumference at widest hip point
   - inseam: crotch to floor
   - sleeve: shoulder point to wrist along the arm
4. Assess CONFIDENCE: "high" (clear photos, good lighting, fitted clothes), "medium" (decent but some uncertainty), "low" (poor quality, baggy clothes, partial body)
5. Based on measurement ranges and "${fitPreference}" fit preference, recommend a US size (XS/S/M/L/XL/XXL).
6. Provide alternatives: one size down (for fitted) and one size up (for relaxed).
7. Write a 1-line "why" explanation.

IMPORTANT: Provide ranges, NOT exact numbers. A 2-4 cm range per measurement is expected.

Return ONLY a JSON object:
{
  "shoulder": { "min": number, "max": number },
  "chest": { "min": number, "max": number },
  "bust": { "min": number, "max": number },
  "waist": { "min": number, "max": number },
  "hips": { "min": number, "max": number },
  "inseam": { "min": number, "max": number },
  "sleeve": { "min": number, "max": number },
  "heightCm": ${heightCm},
  "confidence": "high" | "medium" | "low",
  "recommendedSize": "M",
  "fitPreference": "${fitPreference}",
  "alternatives": { "sizeDown": "S", "sizeUp": "L" },
  "whyLine": "Based on your chest (96-100cm) and waist (82-86cm), M fits best at Zara/H&M with regular fit."
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate required fields
    const { frontPhoto, sidePhoto, heightCm } = body;

    if (!frontPhoto || typeof frontPhoto !== 'string' || frontPhoto.length > 5_000_000) {
      return errorResponse('Invalid front photo', 'VALIDATION_ERROR', 400, corsHeaders);
    }
    if (!sidePhoto || typeof sidePhoto !== 'string' || sidePhoto.length > 5_000_000) {
      return errorResponse('Invalid side photo', 'VALIDATION_ERROR', 400, corsHeaders);
    }
    if (!heightCm || typeof heightCm !== 'number' || heightCm < 120 || heightCm > 230) {
      return errorResponse('Invalid height. Must be 120–230 cm', 'VALIDATION_ERROR', 400, corsHeaders);
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

    const raw = body;
    const parsed = parseOrError(AnalyzeBodySchema, raw);
    if (!parsed.success) {
      return errorResponse(parsed.error, "VALIDATION_ERROR", 400, corsHeaders);
    }
    const { referenceObject, fitPreference } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("LOVABLE_API_KEY is not configured", "CONFIG_ERROR", 500, corsHeaders);

    const makeImagePart = (base64: string, label: string) => {
      const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
      const mediaType = match ? match[1] : "image/jpeg";
      const data = match ? match[2] : base64;

      return [
        { type: "text", text: `--- ${label} ---` },
        {
          type: "image_url",
          image_url: { url: `data:${mediaType};base64,${data}` },
        },
      ];
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: buildSystemPrompt(heightCm, referenceObject || "none", fitPreference || "regular") },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze these 2 photos. My height is ${heightCm} cm. Estimate body measurement ranges.` },
              ...makeImagePart(frontPhoto, "Photo 1: Front View"),
              ...makeImagePart(sidePhoto, "Photo 2: Side View"),
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
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) return errorResponse("No content in AI response", "AI_ERROR", 502, corsHeaders);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return errorResponse("Could not parse measurements from AI response", "PARSE_ERROR", 502, corsHeaders);

    const measurements = JSON.parse(jsonMatch[0]);

    return successResponse(measurements, 200, corsHeaders);
  } catch (e) {
    console.error("analyze-body error:", e);
    return errorResponse(e instanceof Error ? e.message : "Analysis failed", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
