import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Optional: pass batch_size and dry_run in body
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size ?? 50;
    const dryRun = body.dry_run ?? false;

    // Fetch active products with a product_url
    const { data: products, error: fetchErr } = await supabase
      .from("product_catalog")
      .select("id, name, brand, product_url")
      .eq("is_active", true)
      .not("product_url", "is", null)
      .limit(batchSize);

    if (fetchErr) {
      throw new Error(`Fetch error: ${fetchErr.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No products to audit", checked: 0, deactivated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; name: string; brand: string; url: string; status: string; reason: string }[] = [];
    const toDeactivate: string[] = [];

    for (const product of products) {
      const url = product.product_url;

      // Basic URL format validation
      try {
        new URL(url);
      } catch {
        results.push({ id: product.id, name: product.name, brand: product.brand, url, status: "invalid", reason: "Malformed URL" });
        toDeactivate.push(product.id);
        continue;
      }

      // HEAD request to check reachability
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const resp = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
          headers: { "User-Agent": "DripFitCheck-Auditor/1.0" },
        });

        clearTimeout(timeout);

        if (resp.status === 404 || resp.status === 410) {
          results.push({ id: product.id, name: product.name, brand: product.brand, url, status: "dead", reason: `HTTP ${resp.status}` });
          toDeactivate.push(product.id);
        } else if (resp.status >= 400) {
          results.push({ id: product.id, name: product.name, brand: product.brand, url, status: "error", reason: `HTTP ${resp.status}` });
          // Don't deactivate on 403/429 etc — might be anti-bot
        } else {
          results.push({ id: product.id, name: product.name, brand: product.brand, url, status: "ok", reason: `HTTP ${resp.status}` });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Unknown fetch error";
        // Timeout or network error — deactivate
        results.push({ id: product.id, name: product.name, brand: product.brand, url, status: "unreachable", reason });
        toDeactivate.push(product.id);
      }
    }

    // Deactivate broken products
    let deactivatedCount = 0;
    if (!dryRun && toDeactivate.length > 0) {
      const { error: updateErr, count } = await supabase
        .from("product_catalog")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("id", toDeactivate);

      if (updateErr) {
        console.error("Deactivation error:", updateErr.message);
      } else {
        deactivatedCount = count ?? toDeactivate.length;
      }
    }

    const summary = {
      success: true,
      dry_run: dryRun,
      checked: products.length,
      ok: results.filter((r) => r.status === "ok").length,
      dead: results.filter((r) => r.status === "dead").length,
      unreachable: results.filter((r) => r.status === "unreachable").length,
      invalid: results.filter((r) => r.status === "invalid").length,
      error: results.filter((r) => r.status === "error").length,
      deactivated: dryRun ? 0 : deactivatedCount,
      would_deactivate: dryRun ? toDeactivate.length : undefined,
      details: results,
    };

    console.log(`Audit complete: ${summary.checked} checked, ${summary.deactivated || summary.would_deactivate} deactivated`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Audit error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
