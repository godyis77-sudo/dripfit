import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = userData.user.id;
    const { messages: rawMessages } = await req.json();
    if (!Array.isArray(rawMessages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Sanitize: drop any system role injections, cap count and content length.
    const messages = rawMessages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

    // Fetch user context for personalization
    const [scanRes, profileRes, prefRes, feedbackRes] = await Promise.all([
      supabaseAnon.from("body_scans").select("chest_min,chest_max,waist_min,waist_max,hip_min,hip_max,inseam_min,inseam_max,height_cm,shoulder_min,shoulder_max").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
      supabaseAnon.from("profiles").select("gender,preferred_shoe_size,shopping_region").eq("user_id", userId).limit(1),
      supabaseAnon.from("user_preferences").select("fit_preference").eq("user_id", userId).limit(1),
      supabaseAnon.from("fit_feedback").select("retailer,outcome,size_worn").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);

    const scan = scanRes.data?.[0];
    const profile = profileRes.data?.[0];
    const pref = prefRes.data?.[0];
    const feedback = feedbackRes.data || [];

    let userContext = "";
    if (profile) {
      userContext += `User profile: gender=${profile.gender || "not set"}, shoe size=${profile.preferred_shoe_size || "not set"}, region=${profile.shopping_region || "not set"}.\n`;
    }
    if (scan) {
      userContext += `Body measurements (inches): chest=${scan.chest_min}-${scan.chest_max}, waist=${scan.waist_min}-${scan.waist_max}, hips=${scan.hip_min}-${scan.hip_max}, inseam=${scan.inseam_min}-${scan.inseam_max}, shoulder=${scan.shoulder_min}-${scan.shoulder_max}, height=${scan.height_cm}cm.\n`;
    }
    if (pref) {
      userContext += `Fit preference: ${pref.fit_preference}.\n`;
    }
    if (feedback.length > 0) {
      const summary = feedback.map(f => `${f.retailer}: wore ${f.size_worn}, felt ${f.outcome}`).join("; ");
      userContext += `Recent fit feedback: ${summary}.\n`;
    }

    const systemPrompt = `You are DripFitCheck's AI Style Assistant — a friendly, fashion-savvy advisor. You help users decide what to wear, recommend outfits for occasions, suggest sizes based on their body measurements, and give honest style advice.

${userContext ? `Here's what you know about this user:\n${userContext}` : "This user hasn't completed a body scan yet. Encourage them to scan for personalized sizing."}

Guidelines:
- Be conversational, warm, and encouraging — like a stylish best friend
- Give specific, actionable advice (not generic platitudes)
- Reference their actual measurements and fit preferences when recommending sizes
- If they ask about a specific brand, use their fit feedback history to inform recommendations
- Keep responses concise (2-4 paragraphs max unless they ask for detail)
- Use emoji sparingly for personality ✨
- If they haven't scanned, gently suggest it for better recommendations
- You can suggest they check the Browse tab for products or Try-On feature to visualize outfits`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("style-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
