import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.length < 4 || code.length > 20) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for cross-user operations
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find referrer by code
    const { data: referrer, error: refErr } = await admin
      .from("profiles")
      .select("user_id")
      .eq("referral_code", code.toLowerCase())
      .single();

    if (refErr || !referrer) {
      return new Response(JSON.stringify({ error: "Referral code not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-referral
    if (referrer.user_id === userId) {
      return new Response(JSON.stringify({ error: "Cannot use your own code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already referred
    const { data: existing } = await admin
      .from("referrals")
      .select("id")
      .eq("referee_id", userId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ data: { already_claimed: true } }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record referral
    await admin.from("referrals").insert({
      referrer_id: referrer.user_id,
      referee_id: userId,
    });

    // Mark referred_by on new user's profile
    await admin
      .from("profiles")
      .update({ referred_by: code.toLowerCase() })
      .eq("user_id", userId);

    // Credit referrer (+1)
    await admin.rpc("increment_referral_credits", { target_user_id: referrer.user_id });

    return new Response(JSON.stringify({ data: { success: true } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
