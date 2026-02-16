import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { userPhoto, clothingPhoto } = await req.json();

    if (!userPhoto || !clothingPhoto) {
      return new Response(
        JSON.stringify({ error: "Both user photo and clothing photo are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const makeImagePart = (base64: string) => {
      const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
      const mediaType = match ? match[1] : "image/jpeg";
      const data = match ? match[2] : base64;
      return {
        type: "image_url" as const,
        image_url: { url: `data:${mediaType};base64,${data}` },
      };
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "system",
            content: `You are a virtual fashion try-on AI. You will receive two images:
1. A photo of a person (the user)
2. A photo of a clothing item

Your task: Generate a realistic image of the person wearing the clothing item. 
- Maintain the person's body proportions, skin tone, and pose
- Replace or overlay the relevant clothing area with the new garment
- Make it look natural and realistic
- Keep the background and non-clothing areas unchanged

Generate the composite image showing the person wearing the clothing.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Here is the person's photo and the clothing item. Please generate an image of this person wearing this clothing item." },
              { type: "text", text: "--- Person Photo ---" },
              makeImagePart(userPhoto),
              { type: "text", text: "--- Clothing Item ---" },
              makeImagePart(clothingPhoto),
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

    // The image model returns inline images - extract base64 or URL
    // Check for inline_data in parts
    const parts = aiResponse.choices?.[0]?.message?.parts;
    let resultImage: string | null = null;

    if (parts) {
      for (const part of parts) {
        if (part.inline_data) {
          resultImage = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
          break;
        }
      }
    }

    // If content contains a base64 image or URL
    if (!resultImage && content) {
      const b64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
      if (b64Match) {
        resultImage = b64Match[0];
      }
    }

    // If we still don't have an image, return the text content as description
    if (!resultImage) {
      return new Response(
        JSON.stringify({ 
          description: content || "The AI was unable to generate a try-on image. Try with clearer photos.",
          resultImage: null 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ resultImage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("virtual-tryon error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Try-on failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
