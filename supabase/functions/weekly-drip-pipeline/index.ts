import { getCorsHeaders, errorResponse, successResponse } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * weekly-drip-pipeline — Orchestrates the full weekly outfit pipeline:
 *   1. Curate outfits from the catalog (calls curate-weekly-outfits)
 *   2. Mark top outfits as heroes
 *   3. Generate editorial hero images (calls generate-outfit-hero)
 *
 * POST body:
 *   week_id?: string             — defaults to current ISO week
 *   gender?: "mens"|"womens"     — defaults to both
 *   occasion_count?: number      — default 5
 *   outfits_per_occasion?: number — default 5 (first week can be higher)
 *   hero_count?: number          — how many hero images to generate (default 6)
 *   skip_curation?: boolean      — skip step 1 if outfits already exist
 *   skip_images?: boolean        — skip step 3 (just curate + mark heroes)
 */

function getCurrentWeekId(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const weekId = body.week_id || getCurrentWeekId();
    const gender = body.gender as string | undefined;
    const occasionCount = body.occasion_count || 5;
    const outfitsPerOccasion = body.outfits_per_occasion || 5;
    const heroCount = body.hero_count || 6;
    const skipCuration = body.skip_curation ?? false;
    const skipImages = body.skip_images ?? false;

    const log: string[] = [];
    log.push(`[Orchestrator] Starting weekly drip pipeline for ${weekId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // ── Step 1: Curate outfits ─────────────────────────────────────
    if (!skipCuration) {
      log.push(`[Step 1] Curating ${occasionCount} occasions × ${outfitsPerOccasion} outfits${gender ? ` (${gender})` : " (both genders)"}...`);

      const curateRes = await fetch(`${supabaseUrl}/functions/v1/curate-weekly-outfits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          week_id: weekId,
          gender,
          occasion_count: occasionCount,
          outfits_per_occasion: outfitsPerOccasion,
          clear_existing: true,
        }),
      });

      const curateData = await curateRes.json();
      if (!curateRes.ok) {
        log.push(`[Step 1] ❌ Curation failed: ${JSON.stringify(curateData)}`);
        return successResponse({ log, error: "Curation failed" }, 200, cors);
      }

      log.push(`[Step 1] ✅ Created ${curateData.data?.created || 0} outfits`);
      if (curateData.data?.log) {
        curateData.data.log.forEach((l: string) => log.push(`  ${l}`));
      }
    } else {
      log.push(`[Step 1] Skipped (using existing outfits)`);
    }

    // ── Step 2: Select heroes ──────────────────────────────────────
    log.push(`[Step 2] Selecting ${heroCount} hero outfits...`);

    // Get all outfits for this week, pick top per occasion by sort_order
    const { data: weekOutfits, error: fetchErr } = await sb
      .from("weekly_outfits")
      .select("id, occasion, title, gender, sort_order")
      .eq("week_id", weekId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (fetchErr) throw fetchErr;
    if (!weekOutfits || weekOutfits.length === 0) {
      log.push(`[Step 2] ❌ No outfits found for week ${weekId}`);
      return successResponse({ log }, 200, cors);
    }

    // Pick heroes: top N outfits, spread across occasions and genders
    const heroIds: string[] = [];
    const occasionsSeen = new Map<string, number>();

    // Sort by sort_order and pick evenly
    for (const outfit of weekOutfits) {
      if (heroIds.length >= heroCount) break;
      const key = `${outfit.occasion}-${outfit.gender}`;
      const count = occasionsSeen.get(key) || 0;
      if (count >= 1) continue; // Max 1 hero per occasion-gender combo
      heroIds.push(outfit.id);
      occasionsSeen.set(key, count + 1);
    }

    // If we still need more heroes, fill from remaining
    if (heroIds.length < heroCount) {
      for (const outfit of weekOutfits) {
        if (heroIds.length >= heroCount) break;
        if (!heroIds.includes(outfit.id)) {
          heroIds.push(outfit.id);
        }
      }
    }

    // Mark heroes
    if (heroIds.length > 0) {
      // Reset all heroes for this week first
      await sb.from("weekly_outfits").update({ is_hero: false }).eq("week_id", weekId);
      // Set selected heroes
      await sb.from("weekly_outfits").update({ is_hero: true }).in("id", heroIds);
    }

    const heroOutfits = weekOutfits.filter(o => heroIds.includes(o.id));
    log.push(`[Step 2] ✅ Marked ${heroIds.length} heroes:`);
    heroOutfits.forEach(h => log.push(`  → "${h.title}" (${h.occasion}, ${h.gender})`));

    // ── Step 3: Generate hero images ───────────────────────────────
    if (!skipImages) {
      log.push(`[Step 3] Generating hero images...`);

      let generated = 0;
      let failed = 0;

      for (const heroId of heroIds) {
        const hero = heroOutfits.find(h => h.id === heroId);
        log.push(`[Step 3] Generating: "${hero?.title || heroId}"...`);

        try {
          const genRes = await fetch(`${supabaseUrl}/functions/v1/generate-outfit-hero`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              outfit_id: heroId,
              regenerate: true,
            }),
          });

          const genData = await genRes.json();
          if (genRes.ok && genData.data?.hero_url) {
            log.push(`[Step 3] ✅ Generated: ${genData.data.hero_url.substring(0, 80)}...`);
            generated++;
          } else {
            log.push(`[Step 3] ⚠️ Failed: ${genData.error?.message || "unknown"}`);
            failed++;
          }

          // Rate limit buffer between generations
          if (heroIds.indexOf(heroId) < heroIds.length - 1) {
            await new Promise(r => setTimeout(r, 5000));
          }
        } catch (err) {
          log.push(`[Step 3] ❌ Error: ${err.message}`);
          failed++;

          if (err.message === "RATE_LIMITED") {
            log.push(`[Step 3] Rate limited — waiting 30s...`);
            await new Promise(r => setTimeout(r, 30000));
          }
        }
      }

      log.push(`[Step 3] Images: ${generated} generated, ${failed} failed`);
    } else {
      log.push(`[Step 3] Skipped image generation`);
    }

    log.push(`[Done] Pipeline completed for week ${weekId}`);

    return successResponse({
      week_id: weekId,
      total_outfits: weekOutfits.length,
      heroes: heroIds.length,
      log,
    }, 200, cors);
  } catch (err) {
    console.error("weekly-drip-pipeline error:", err);
    return errorResponse(err.message || "Internal error", "PIPELINE_ERROR", 500, cors);
  }
});
