import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { successResponse, errorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return errorResponse("STRIPE_SECRET_KEY is not set", "CONFIG_ERROR", 500, corsHeaders);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("No authorization header provided", "AUTH_ERROR", 401, corsHeaders);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) return errorResponse(`Authentication error: ${userError.message}`, "AUTH_ERROR", 401, corsHeaders);
    const user = userData.user;
    if (!user?.email) return errorResponse("User not authenticated or email not available", "AUTH_ERROR", 401, corsHeaders);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) return errorResponse("No Stripe customer found for this user", "NOT_FOUND", 404, corsHeaders);

    const origin = req.headers.get("origin") || "https://dripfit.lovable.app";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/premium`,
    });

    return successResponse({ url: portalSession.url }, 200, corsHeaders);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return errorResponse(msg, "INTERNAL_ERROR", 500, corsHeaders);
  }
});
