import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return errorResponse("STRIPE_SECRET_KEY is not set", "CONFIG_ERROR", 500, corsHeaders);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("No authorization header provided", "AUTH_ERROR", 401, corsHeaders);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) return errorResponse(`Authentication error: ${userError.message}`, "AUTH_ERROR", 401, corsHeaders);
    const user = userData.user;
    if (!user?.email) return errorResponse("User not authenticated or email not available", "AUTH_ERROR", 401, corsHeaders);
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return successResponse({ subscribed: false }, 200, corsHeaders);
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const trialSubs = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 });
    const allSubs = [...subscriptions.data, ...trialSubs.data];
    const hasActiveSub = allSubs.length > 0;

    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const sub = allSubs[0];
      if (sub.current_period_end && typeof sub.current_period_end === 'number') {
        subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      }
      productId = sub.items.data[0]?.price?.product ?? null;
      logStep("Active subscription found", { productId, subscriptionEnd });

      // ─── Award referrer commission on Premium upgrade ──────────────────
      // Idempotent via UNIQUE INDEX (creator_id, referee_id) on creator_commissions.
      try {
        const { data: referral } = await supabaseClient
          .from("referrals")
          .select("id, referrer_id")
          .eq("referee_id", user.id)
          .maybeSingle();

        if (referral?.referrer_id) {
          const { data: isCreator } = await supabaseClient.rpc("has_role", {
            _user_id: referral.referrer_id,
            _role: "creator",
          });

          if (isCreator) {
            const d = new Date();
            const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
            const { data: monthCount } = await supabaseClient.rpc("get_creator_month_count", {
              p_creator_id: referral.referrer_id,
              p_month_key: monthKey,
            });
            const count = monthCount ?? 0;
            const isBonus = count + 1 >= 100;
            const amountCents = isBonus ? 150 : 100;
            const tierLabel = isBonus ? "bonus" : "base";

            const { error: insErr } = await supabaseClient.from("creator_commissions").insert({
              creator_id: referral.referrer_id,
              referee_id: user.id,
              referral_id: referral.id,
              amount_cents: amountCents,
              currency: "USD",
              tier_label: tierLabel,
              status: "pending",
              month_key: monthKey,
            });
            if (insErr && !String(insErr.message).toLowerCase().includes("duplicate")) {
              logStep("Commission insert error", { message: insErr.message });
            } else if (!insErr) {
              logStep("Premium commission awarded", { creator_id: referral.referrer_id, amountCents, tierLabel });
            }
          }
        }
      } catch (commissionErr) {
        logStep("Commission award skipped", { message: commissionErr instanceof Error ? commissionErr.message : String(commissionErr) });
      }
    }

    return successResponse({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }, 200, corsHeaders);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return errorResponse(msg, "INTERNAL_ERROR", 500, corsHeaders);
  }
});
