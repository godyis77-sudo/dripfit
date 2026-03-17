import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/validation.ts";

// ─── Commission Tier Config ─────────────────────────────────────────────────
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
  const corsHeaders = getCorsHeaders(req);

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

    const { code, promo_code } = await req.json();
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

    // ─── Promo Code Logic ───────────────────────────────────────────────
    let promoApplied = false;
    let bonusTryons = 0;

    if (promo_code && typeof promo_code === "string" && promo_code.length >= 3 && promo_code.length <= 30) {
      const { data: promo } = await admin
        .from("promo_codes")
        .select("id, creator_id, bonus_tryons, max_uses, used_count, is_active")
        .eq("code", promo_code.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (promo) {
        // Check max uses
        const withinLimit = promo.max_uses === null || promo.used_count < promo.max_uses;
        // Promo must belong to the referrer
        const belongsToReferrer = promo.creator_id === referrer.user_id;

        if (withinLimit && belongsToReferrer) {
          bonusTryons = promo.bonus_tryons || 10;
          promoApplied = true;

          // Increment used_count
          await admin
            .from("promo_codes")
            .update({ used_count: promo.used_count + 1 })
            .eq("id", promo.id);

          // Grant bonus try-ons to the new user by decrementing their usage counter
          // (negative count = bonus credits)
          const monthKey = getMonthKey();
          await admin.from("tryon_usage").upsert(
            { user_id: userId, month_key: monthKey, count: -bonusTryons },
            { onConflict: "user_id,month_key" }
          );
        }
      }
    }

    // ─── Creator Commission Logic ───────────────────────────────────────
    const { data: isCreator } = await admin.rpc("has_role", {
      _user_id: referrer.user_id,
      _role: "creator",
    });

    if (isCreator) {
      const monthKey = getMonthKey();

      const { data: monthCount } = await admin.rpc("get_creator_month_count", {
        p_creator_id: referrer.user_id,
        p_month_key: monthKey,
      });

      const { amountCents, tierLabel } = resolveCommission(monthCount ?? 0);

      await admin.from("creator_commissions").insert({
        creator_id: referrer.user_id,
        referee_id: userId,
        referral_id: referralRow?.id ?? null,
        amount_cents: amountCents,
        currency: COMMISSION_CURRENCY,
        tier_label: tierLabel,
        status: "pending",
        month_key: monthKey,
      });
    }

    return new Response(JSON.stringify({ data: { success: true, promo_applied: promoApplied, bonus_tryons: bonusTryons } }), {
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
