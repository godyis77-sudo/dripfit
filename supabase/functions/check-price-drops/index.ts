import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all active price watches with their product_id
    const { data: watches, error: watchErr } = await supabase
      .from("price_watches")
      .select("id, user_id, product_id, current_price_cents, lowest_price_cents")
      .not("product_id", "is", null);

    if (watchErr) throw watchErr;
    if (!watches || watches.length === 0) {
      return new Response(JSON.stringify({ checked: 0, drops: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique product IDs and fetch current catalog prices
    const productIds = [...new Set(watches.map((w) => w.product_id).filter(Boolean))];
    const { data: products } = await supabase
      .from("product_catalog")
      .select("id, price_cents")
      .in("id", productIds)
      .eq("is_active", true);

    const priceMap = new Map<string, number>();
    (products || []).forEach((p) => {
      if (p.price_cents) priceMap.set(p.id, p.price_cents);
    });

    let dropCount = 0;
    const now = new Date().toISOString();

    for (const watch of watches) {
      if (!watch.product_id) continue;
      const catalogPrice = priceMap.get(watch.product_id);
      if (!catalogPrice) continue;

      // Update last_checked timestamp and current price
      const updates: Record<string, unknown> = {
        current_price_cents: catalogPrice,
        last_checked_at: now,
      };

      // Track lowest price
      if (catalogPrice < watch.lowest_price_cents) {
        updates.lowest_price_cents = catalogPrice;
      }

      // Detect price drop (at least 5% drop from current tracked price)
      if (catalogPrice < watch.current_price_cents) {
        const dropPercent = Math.round(
          ((watch.current_price_cents - catalogPrice) / watch.current_price_cents) * 100
        );

        if (dropPercent >= 5) {
          // Create notification
          await supabase.from("price_drop_notifications").insert({
            user_id: watch.user_id,
            watch_id: watch.id,
            old_price_cents: watch.current_price_cents,
            new_price_cents: catalogPrice,
            drop_percent: dropPercent,
          });
          dropCount++;
        }
      }

      await supabase
        .from("price_watches")
        .update(updates)
        .eq("id", watch.id);
    }

    return new Response(
      JSON.stringify({ checked: watches.length, drops: dropCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Price check error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
