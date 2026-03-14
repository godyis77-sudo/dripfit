import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Commission Tier Config ─────────────────────────────────────────────────
// Tiers are evaluated top-down; first matching tier wins.
const COMMISSION_TIERS = [
  { minConversions: 100, amountCents: 150, label: "bonus" },
  { minConversions: 1, amountCents: 50, label: "base" },
];
const COMMISSION_CURRENCY = "USD";

function getMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function resolveCommission(monthlyCount: number) {
  for (const tier of COMMISSION_TIERS) {
    if (monthlyCount + 1 >= tier.minConversions) {
      return { amountCents: tier.amountCents, tierLabel: tier.label };
    }
  }
  return { amountCents: 50, tierLabel: "base" };
}

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

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

    // Check if already referred (dedup by referee_id)
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
    const { data: referralRow } = await admin.from("referrals").insert({
      referrer_id: referrer.user_id,
      referee_id: userId,
    }).select("id").single();

    // Mark referred_by on new user's profile
    await admin
      .from("profiles")
      .update({ referred_by: code.toLowerCase() })
      .eq("user_id", userId);

    // Credit referrer (+1 legacy credits)
    await admin.rpc("increment_referral_credits", { target_user_id: referrer.user_id });

    // ─── Creator Commission Logic ───────────────────────────────────────
    // Check if referrer has 'creator' role
    const { data: isCreator } = await admin.rpc("has_role", {
      _user_id: referrer.user_id,
      _role: "creator",
    });

    if (isCreator) {
      const monthKey = getMonthKey();

      // Get current month count for tier calculation
      const { data: monthCount } = await admin.rpc("get_creator_month_count", {
        p_creator_id: referrer.user_id,
        p_month_key: monthKey,
      });

      const { amountCents, tierLabel } = resolveCommission(monthCount ?? 0);

      // Insert commission (unique index on creator_id + referee_id prevents dupes)
      await admin.from("creator_commissions").insert({
        creator_id: referrer.user_id,
        referee_id: userId,
        referral_id: referralRow?.id ?? null,
        amount_cents: amountCents,
        currency: "GBP",
        tier_label: tierLabel,
        status: "pending",
        month_key: monthKey,
      });
    }

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
