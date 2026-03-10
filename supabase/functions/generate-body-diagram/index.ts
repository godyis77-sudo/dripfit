import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { successResponse, errorResponse } from "../_shared/validation.ts";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("LOVABLE_API_KEY not configured", "CONFIG_ERROR", 500, corsHeaders);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content:
                "Generate a clean, minimal, front-facing human body silhouette suitable for a body measurement diagram. The figure should be gender-neutral, standing upright with arms slightly away from the body, feet shoulder-width apart. Use a solid dark charcoal/gray tone for the silhouette. The background should be a smooth vertical gradient from white at the top to a warm golden beige (like #D4C5A0) at the bottom. NO transparent background, NO checkered pattern. The style should be smooth, anatomically proportioned, and modern — like a fashion tech app icon. No face details, no clothing, just a clean outline fill. The image should be tall and narrow, portrait orientation, approximately 3:5 aspect ratio.",
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return errorResponse("Rate limited, please try again later.", "RATE_LIMITED", 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse("Payment required.", "PAYMENT_REQUIRED", 402, corsHeaders);
      }

      return errorResponse("Failed to generate image", "AI_ERROR", 500, corsHeaders);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data).slice(0, 500));
      return errorResponse("No image generated", "AI_ERROR", 500, corsHeaders);
    }

    return successResponse({ image: imageUrl }, 200, corsHeaders);
  } catch (e) {
    console.error("generate-body-diagram error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
