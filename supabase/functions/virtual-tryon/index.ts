import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { VirtualTryonSchema, parseOrError } from "../_shared/validation.ts";

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
    const parsed = parseOrError(VirtualTryonSchema, raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { userPhoto, clothingPhoto } = parsed.data;
    const itemType: string = raw.itemType || "clothing";
    const isAccessory = ["accessory", "jewelry", "necklace", "bracelet", "earrings", "ring", "watch", "hat", "cap", "sunglasses", "glasses", "bag", "purse", "handbag", "belt", "scarf", "shoes", "sneakers", "boots", "heels"].includes(itemType.toLowerCase());
    const isLayering = raw.isLayering === true;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Convert a URL or base64 string into a data URI, falling back to raw URL
    const toImageInput = async (input: string): Promise<string> => {
      if (input.startsWith("data:")) return input;
      if (input.startsWith("http://") || input.startsWith("https://")) {
        // Try to fetch & convert; if CDN rejects, pass the raw URL
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(input, { 
              signal: controller.signal,
              headers: { 
                'User-Agent': 'Mozilla/5.0 (compatible; DripCheck/1.0)',
                'Accept': 'image/*',
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
            console.warn(`Fetch attempt ${attempt + 1} failed for ${input}: ${e}`);
            if (attempt === 2) {
              // Fallback: let the AI gateway fetch it directly
              console.log("Falling back to raw URL for AI gateway");
              return input;
            }
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
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
              { type: "text", text: "I have two images: the first is a photo of a person (or a person already wearing an outfit), and the second is an item (clothing or accessory like shoes, hat, jewelry, necklace, earrings, bracelet, watch, bag, or sunglasses). Generate a new image showing this exact person wearing/using the item from the second image in addition to whatever they are already wearing. Keep the person's face, body, pose, background, and existing outfit exactly the same. Only add the new item from the second image. Output the resulting image." },
              makeImagePart(userImageInput),
              makeImagePart(clothingImageInput),
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
