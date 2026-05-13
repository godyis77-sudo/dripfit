// Admin-gated catalog ops trigger.
// Verifies caller is an admin (auth.getUser + has_role), then fires the
// 4 paid backend jobs in the background using the service role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JobName = "backfill-descriptions" | "scrape-all-products" | "scrape-size-charts";

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
      // chain a second batch a bit later for more coverage
      setTimeout(() => fireJob("backfill-descriptions", { batch_size: 500, background: true }), 60_000);
    }
    if (job === "all" || job === "scrape-all-products") {
      // Two batches so we don't blow the runtime cap
      await fireJob("scrape-all-products", { batch: 0, totalBatches: 2, dispatchDelayMs: 1500 });
      setTimeout(() => fireJob("scrape-all-products", { batch: 1, totalBatches: 2, dispatchDelayMs: 1500 }), 5_000);
    }
    if (job === "all" || job === "scrape-size-charts") {
      await fireJob("scrape-size-charts", {});
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
