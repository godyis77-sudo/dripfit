import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AnalyzeSizeGuideSchema, parseOrError } from "../_shared/validation.ts";

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
    const parsed = parseOrError(AnalyzeSizeGuideSchema, raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { sizeGuideImage, measurements, brandName } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const match = sizeGuideImage.match(/^data:(image\/\w+);base64,(.+)$/);
    const mediaType = match ? match[1] : "image/jpeg";
    const data = match ? match[2] : sizeGuideImage;

    const systemPrompt = `You are an expert fashion sizing consultant. You will receive:
1. An image of a brand's size guide or size chart
2. A person's actual body measurements in inches

Your task:
1. READ and PARSE the size guide/chart from the image. Extract all sizes and their corresponding measurement ranges.
2. COMPARE the person's measurements against the chart.
3. RECOMMEND the best size for this person from this specific brand's chart.
4. Explain your reasoning, noting which measurements are the deciding factors.

Return ONLY a JSON object with this exact format:
{
  "recommendedSize": "M",
  "confidence": "high",
  "breakdown": [
    { "measurement": "Chest", "userValue": "40 in", "chartRange": "38-42 in", "fitsSize": "M", "fit": "good" },
    { "measurement": "Waist", "userValue": "34 in", "chartRange": "32-35 in", "fitsSize": "M", "fit": "good" }
  ],
  "notes": "Brief explanation of the recommendation",
  "alternativeSize": "L",
  "alternativeReason": "If you prefer a looser fit"
}

"fit" can be: "tight", "good", "loose"
"confidence" can be: "high", "medium", "low"
Only include measurements that appear in the size chart.`;

    const userMessage = `Here is the size guide image${brandName ? ` for ${brandName}` : ""}. 

My body measurements (in inches):
- Shoulder: ${measurements.shoulder}
- Chest: ${measurements.chest}
- Waist: ${measurements.waist}
- Hips: ${measurements.hips}
- Inseam: ${measurements.inseam}
- Height: ${measurements.height}

Please analyze the size chart and recommend the best size for me.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              {
                type: "image_url",
                image_url: { url: `data:${mediaType};base64,${data}` },
              },
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
    if (!jsonMatch) throw new Error("Could not parse recommendation from AI response");

    const recommendation = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-size-guide error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
