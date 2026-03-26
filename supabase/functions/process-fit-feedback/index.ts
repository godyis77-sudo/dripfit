import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Aggregates fit feedback for a retailer and returns accuracy stats.
 * Called after new feedback is submitted.
 * Also returns personalized size adjustment suggestions.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = userData.user.id;
    const { retailer } = await req.json();

    // Get all feedback for this user
    const { data: allFeedback } = await supabase
      .from("fit_feedback")
      .select("retailer, outcome, size_worn, recommended_size")
      .eq("user_id", userId);

    if (!allFeedback || allFeedback.length === 0) {
      return new Response(JSON.stringify({ 
        accuracy: null, 
        totalFeedback: 0,
        adjustments: {} 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calculate overall accuracy
    const perfect = allFeedback.filter(f => f.outcome === "perfect").length;
    const accuracy = Math.round((perfect / allFeedback.length) * 100);

    // Calculate per-retailer adjustments
    const retailerGroups: Record<string, { tight: number; perfect: number; loose: number; total: number }> = {};
    for (const fb of allFeedback) {
      if (!retailerGroups[fb.retailer]) {
        retailerGroups[fb.retailer] = { tight: 0, perfect: 0, loose: 0, total: 0 };
      }
      const g = retailerGroups[fb.retailer];
      g.total++;
      if (fb.outcome === "tight") g.tight++;
      else if (fb.outcome === "perfect") g.perfect++;
      else if (fb.outcome === "loose") g.loose++;
    }

    // Generate adjustment suggestions
    const adjustments: Record<string, { suggestion: string; confidence: string }> = {};
    for (const [ret, stats] of Object.entries(retailerGroups)) {
      if (stats.total < 2) {
        adjustments[ret] = { suggestion: "Need more feedback", confidence: "low" };
        continue;
      }
      const tightRatio = stats.tight / stats.total;
      const looseRatio = stats.loose / stats.total;
      
      if (tightRatio >= 0.6) {
        adjustments[ret] = { suggestion: "Size up", confidence: stats.total >= 4 ? "high" : "medium" };
      } else if (looseRatio >= 0.6) {
        adjustments[ret] = { suggestion: "Size down", confidence: stats.total >= 4 ? "high" : "medium" };
      } else {
        adjustments[ret] = { suggestion: "Current sizing accurate", confidence: stats.total >= 3 ? "high" : "medium" };
      }
    }

    return new Response(JSON.stringify({
      accuracy,
      totalFeedback: allFeedback.length,
      retailerStats: retailerGroups,
      adjustments,
      requestedRetailer: retailer ? adjustments[retailer] || null : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("process-fit-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
