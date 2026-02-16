import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CALIBRATION_SIZES: Record<string, string> = {
  ruler: "a standard 12-inch (30 cm) ruler",
  loonie: "a Canadian Loonie coin, which is 26.5 mm (1.043 inches) in diameter",
  quarter: "a US Quarter coin, which is 24.26 mm (0.955 inches) in diameter",
  five_dollar_bill: "a Canadian $5 bill, which is 152.4 mm (6 inches) long and 69.85 mm (2.75 inches) tall",
};

function buildSystemPrompt(calibrationObject: string): string {
  const objDesc = CALIBRATION_SIZES[calibrationObject] || CALIBRATION_SIZES["ruler"];

  return `You are an expert body measurement AI. You will receive 3 photos of a person:
1. Front-facing view with a reference object visible
2. Side view with reference object visible  
3. Arms extended outward with reference object visible

The reference object in the photos is ${objDesc}.

Your task:
1. DETECT THE REFERENCE OBJECT in each image and use its known real-world size to establish a pixel-to-real-unit scale ratio.
2. IDENTIFY BODY LANDMARKS: shoulders, chest line, natural waist, hip line, crotch/inseam point, wrists, neck base, shoulder tips.
3. CALCULATE these measurements in inches (rounded to nearest 0.5):
   - chest: circumference at fullest point (use front width × π/2 + side depth × π/2)
   - waist: circumference at natural waist (narrowest point of torso)
   - hips: circumference at widest point of hips/buttocks
   - inseam: from crotch to floor
   - armLength: from shoulder tip to wrist
   - shoulderWidth: shoulder tip to shoulder tip
   - neck: circumference at base of neck
   - torsoLength: from shoulder to natural waist

4. RECOMMEND a clothing size (XS, S, M, L, XL, XXL) based on standard US sizing.

Return ONLY a JSON object with this exact format, no other text:
{
  "measurements": {
    "chest": number,
    "waist": number,
    "hips": number,
    "inseam": number,
    "armLength": number,
    "shoulderWidth": number,
    "neck": number,
    "torsoLength": number
  },
  "sizeRecommendation": "M"
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frontPhoto, sidePhoto, armsOutPhoto, calibrationObject } = await req.json();
    const calObj = calibrationObject || "ruler";

    if (!frontPhoto || !sidePhoto || !armsOutPhoto) {
      return new Response(
        JSON.stringify({ error: "All 3 photos are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build image content parts from base64
    const makeImagePart = (base64: string, label: string) => {
      // Strip data:image/...;base64, prefix if present
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
          { role: "system", content: buildSystemPrompt(calObj) },
          {
            role: "user",
            content: [
              { type: "text", text: "Please analyze these 3 photos and calculate body measurements using the reference object as scale reference." },
              ...makeImagePart(frontPhoto, "Photo 1: Front View"),
              ...makeImagePart(sidePhoto, "Photo 2: Side View"),
              ...makeImagePart(armsOutPhoto, "Photo 3: Arms Extended"),
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

    // Parse JSON from response (may be wrapped in markdown code block)
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
