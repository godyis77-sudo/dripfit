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
        modalities: ["text", "image"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "I have two images: the first is a photo of a person, and the second is a clothing item. Generate a new image showing this exact person wearing the clothing item from the second image. Keep the person's face, body, pose, and background exactly the same. Only change their outfit to match the clothing shown in the second image. Output the resulting image." },
              makeImagePart(userPhoto),
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
    const message = aiResponse.choices?.[0]?.message;
    let resultImage: string | null = null;

    // The gateway returns images in message.images array
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const img = message.images[0];
      if (img?.image_url?.url) {
        resultImage = img.image_url.url;
      }
    }

    if (!resultImage) {
      const textContent = typeof message?.content === "string" ? message.content : "";
      return new Response(
        JSON.stringify({ 
          description: textContent || "The AI was unable to generate a try-on image. Try with clearer photos.",
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
