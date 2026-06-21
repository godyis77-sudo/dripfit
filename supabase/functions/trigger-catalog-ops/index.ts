// Admin-gated catalog ops trigger.
// Verifies caller is an admin (auth.getUser + has_role), then fires the
// backend jobs in the background using the service role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JobName =
  | "backfill-descriptions"
  | "scrape-all-products"
  | "scrape-size-charts"
  | "backfill-images"
  | "generate-outfit-hero"
  | "curate-weekly-outfits"
  | "categorize-products";

async function fireJob(name: JobName, body: Record<string, unknown>) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text().catch(() => "");
  console.log(`[trigger-catalog-ops] ${name} -> ${resp.status} ${text.slice(0, 200)}`);
  return { name, status: resp.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verify admin caller
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userData.user.id, _role: "admin",
  });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const job: string = body.job || "all";

  const work = async () => {
    if (job === "all" || job === "backfill-descriptions") {
      await fireJob("backfill-descriptions", { batch_size: 500, background: true });
      setTimeout(() => fireJob("backfill-descriptions", { batch_size: 500, background: true }), 60_000);
    }
    if (job === "all" || job === "scrape-all-products") {
      // Two scrape batches so we don't blow the runtime cap
      await fireJob("scrape-all-products", { batch: 0, totalBatches: 2, dispatchDelayMs: 1500 });
      setTimeout(() => fireJob("scrape-all-products", { batch: 1, totalBatches: 2, dispatchDelayMs: 1500 }), 5_000);
      // Auto-chain gallery image backfill ~4 min after scrape kicks off
      // so newly inserted single-image products get their additional_images populated.
      setTimeout(() => fireJob("backfill-images", { batch_size: 200, background: true }), 240_000);
      setTimeout(() => fireJob("backfill-images", { batch_size: 200, background: true }), 360_000);
    }
    if (job === "all" || job === "scrape-size-charts") {
      await fireJob("scrape-size-charts", {});
    }
    if (job === "backfill-images") {
      // Manual standalone run — fire two staggered batches
      await fireJob("backfill-images", { batch_size: 200, background: true });
      setTimeout(() => fireJob("backfill-images", { batch_size: 200, background: true }), 90_000);
    }
    if (job === "generate-missing-womens-heroes") {
      // Fire hero generation for the two missing womens heroes
      await fireJob("generate-outfit-hero", { outfit_id: "aa8606fb-610b-43f2-b951-9b7fc22514f4", regenerate: true });
      setTimeout(() => fireJob("generate-outfit-hero", { outfit_id: "84e8e754-81d1-4ce6-9bee-2d1f1af74421", regenerate: true }), 5_000);
    }
    if (job === "recurate-beach") {
      // Re-curate beach occasions for both genders. clear_existing:false so we
      // don't wipe other occasions in the current week.
      await fireJob("curate-weekly-outfits", {
        occasions: ["beach_day", "beach_tropical"],
        clear_existing: false,
        outfits_per_occasion: 4,
      });
    }

    if (job === "curate-summer-now") {
      // Fire curate immediately — assumes scrape/backfill already ran.
      // 5 occasions × 2 genders × 30 = 300 outfits. Heroes auto-trigger inside curate.
      await fireJob("curate-weekly-outfits", {
        occasions: ["beach_day", "beach_tropical", "patio_evening", "summer_night_out", "festival"],
        outfits_per_occasion: 30,
        clear_existing: true,
        skip_hero: false,
      });
    }

    if (job === "summer-blast") {
      // FULL summer blast: rescrape catalog, rebalance categories, backfill
      // descriptions + gallery images, then curate 300 summer outfits across
      // 5 occasions × 2 genders × 30 each. Heroes auto-trigger from curate.

      // 1) Kick off scrape (2 batches)
      await fireJob("scrape-all-products", { batch: 0, totalBatches: 2, dispatchDelayMs: 1500 });
      setTimeout(() => fireJob("scrape-all-products", { batch: 1, totalBatches: 2, dispatchDelayMs: 1500 }), 5_000);

      // 2) Rebalance categories ~3 min in
      setTimeout(() => fireJob("categorize-products", { batch_size: 500, background: true }), 180_000);
      setTimeout(() => fireJob("categorize-products", { batch_size: 500, background: true }), 300_000);

      // 3) Backfill gallery images ~5–7 min in
      setTimeout(() => fireJob("backfill-images", { batch_size: 200, background: true }), 300_000);
      setTimeout(() => fireJob("backfill-images", { batch_size: 200, background: true }), 420_000);

      // 4) Backfill descriptions ~6–8 min in
      setTimeout(() => fireJob("backfill-descriptions", { batch_size: 500, background: true }), 360_000);
      setTimeout(() => fireJob("backfill-descriptions", { batch_size: 500, background: true }), 480_000);

      // 5) Curate 300 summer outfits ~10 min in (after fresh products land).
      //    5 occasions × 2 genders × 30 = 300. Heroes auto-trigger.
      setTimeout(() => fireJob("curate-weekly-outfits", {
        occasions: ["beach_day", "beach_tropical", "patio_evening", "summer_night_out", "festival"],
        outfits_per_occasion: 30,
        clear_existing: true,
        skip_hero: false,
      }), 600_000);
    }
  };

  // @ts-ignore EdgeRuntime is available in Deno Deploy
  EdgeRuntime.waitUntil(work());

  return new Response(JSON.stringify({
    ok: true,
    fired: job,
    note: "Jobs dispatched in background. Check edge function logs for progress.",
  }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
