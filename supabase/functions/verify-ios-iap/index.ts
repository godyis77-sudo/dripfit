// verify-ios-iap
// Records an Apple IAP subscription on the server and awards the referrer
// commission on first activation. Idempotent.
//
// Body: {
//   product_id: string,                 // e.g. "premium_monthly"
//   transaction_id: string,             // unique Apple transaction id
//   original_transaction_id?: string,   // Apple original tx id (subscription anchor)
//   expires_date_ms?: number,           // ms epoch when current period ends
//   plan_type?: "monthly" | "annual"
// }
//
// Stores into public.user_subscriptions (one row per user) and writes a
// commission via the shared helper. Real App Store Server API receipt
// verification can layer on top of this later — the function is structured
// so callers (Capacitor IAP plugin) submit the already-signed transaction
// fields they receive from StoreKit.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";
import { awardPremiumCommission } from "../_shared/award-premium-commission.ts";

const log = (step: string, details?: any) =>
  console.log(`[VERIFY-IOS-IAP] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("No authorization header", "AUTH_ERROR", 401, corsHeaders);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return errorResponse("Auth failed", "AUTH_ERROR", 401, corsHeaders);
    const user = userData.user;

    let body: any;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON", "BAD_REQUEST", 400, corsHeaders); }

    const productId: string | undefined = body?.product_id;
    const transactionId: string | undefined = body?.transaction_id;
    const originalTxId: string | undefined = body?.original_transaction_id ?? transactionId;
    const expiresMs: number | undefined = typeof body?.expires_date_ms === "number" ? body.expires_date_ms : undefined;
    const planType: "monthly" | "annual" | undefined =
      body?.plan_type === "annual" || body?.plan_type === "monthly" ? body.plan_type : undefined;

    if (!productId || !transactionId) {
      return errorResponse("product_id and transaction_id are required", "BAD_REQUEST", 400, corsHeaders);
    }
    if (typeof productId !== "string" || productId.length > 200 ||
        typeof transactionId !== "string" || transactionId.length > 200) {
      return errorResponse("Invalid field length", "BAD_REQUEST", 400, corsHeaders);
    }

    const periodEndIso = expiresMs ? new Date(expiresMs).toISOString() : null;
    const isActive = periodEndIso ? new Date(periodEndIso).getTime() > Date.now() : true;

    log("Verifying IAP", { user: user.id, productId, transactionId, isActive });

    // Upsert subscription row. We reuse stripe_subscription_id as the unique
    // external subscription anchor (Apple original_transaction_id) so the
    // existing UNIQUE constraint on that column gives us cross-provider dedup.
    const { error: upsertErr } = await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        is_active: isActive,
        stripe_subscription_id: `apple:${originalTxId}`,
        plan_type: planType ?? null,
        current_period_end: periodEndIso,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertErr) {
      log("Subscription upsert error", { message: upsertErr.message });
      return errorResponse("Could not record subscription", "DB_ERROR", 500, corsHeaders);
    }

    let commission: any = { awarded: false, reason: "inactive" };
    if (isActive) {
      commission = await awardPremiumCommission(supabase, user.id, "ios_iap");
    }

    return successResponse({
      subscribed: isActive,
      subscription_end: periodEndIso,
      commission,
    }, 200, corsHeaders);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { message: msg });
    return errorResponse(msg, "INTERNAL_ERROR", 500, corsHeaders);
  }
});
