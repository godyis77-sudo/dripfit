import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AnalyzeBodySchema, parseOrError } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const raw = await req.json();
    const parsed = parseOrError(AnalyzeBodySchema, raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { frontPhoto, sidePhoto, heightCm, referenceObject, fitPreference } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in AI response");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse measurements from AI response");

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-body error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
