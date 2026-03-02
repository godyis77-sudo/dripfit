import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SizeEntry {
  label: string;
  chest_min?: number; chest_max?: number;
  waist_min?: number; waist_max?: number;
  hip_min?: number; hip_max?: number;
  inseam_min?: number; inseam_max?: number;
  shoulder_min?: number; shoulder_max?: number;
  shoe_length_min?: number; shoe_length_max?: number;
}

const CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
  tops:       { chest: 0.40, waist: 0.30, shoulder: 0.30 },
  bottoms:    { waist: 0.40, hip: 0.40, inseam: 0.20 },
  dresses:    { chest: 0.30, waist: 0.35, hip: 0.35 },
  outerwear:  { chest: 0.40, waist: 0.20, hip: 0.10, shoulder: 0.30 },
  activewear: { chest: 0.25, waist: 0.35, hip: 0.30, inseam: 0.10 },
  footwear:   { shoe_length: 1.00 },
};

function scoreMeasurement(userVal: number, min: number, max: number): number {
  const mid = (min + max) / 2;
  const rangeHalf = (max - min) / 2 || 1;
  if (userVal >= min && userVal <= max) {
    return 1.0 - (Math.abs(userVal - mid) / rangeHalf) * 0.2;
  }
  if (userVal < min) {
    return Math.max(0, 1.0 - ((min - userVal) / rangeHalf) * 0.8);
  }
  return Math.max(0, 1.0 - ((userVal - max) / rangeHalf) * 0.8);
}

function applyFitOffset(val: number, fit: string): number {
  if (fit === "slim") return val - 2;
  if (fit === "relaxed") return val + 3;
  return val;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, brand_slug, category, fit_preference = "regular" } = await req.json();

    if (!user_id || !brand_slug || !category) {
      return new Response(JSON.stringify({ error: "user_id, brand_slug, and category are required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validFits = ["slim", "regular", "relaxed"];
    const fit = validFits.includes(fit_preference) ? fit_preference : "regular";
    const validCategories = Object.keys(CATEGORY_WEIGHTS);
    if (!validCategories.includes(category)) {
      return new Response(JSON.stringify({ error: `Invalid category. Must be one of: ${validCategories.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // STEP 1 — Check cache
    const { data: cached } = await supabase
      .from("size_recommendations_cache")
      .select("*")
      .eq("user_id", user_id)
      .eq("brand_slug", brand_slug)
      .eq("category", category)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({
        recommended_size: cached.recommended_size,
        confidence: Number(Number(cached.confidence).toFixed(2)),
        fit_status: cached.fit_status,
        fit_notes: cached.fit_notes,
        second_option: cached.second_option,
        fit_preference: fit,
        brand_slug,
        category,
        all_sizes: [],
        cached: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // STEP 2 — Fetch user measurements from latest body_scan
    const { data: scan } = await supabase
      .from("body_scans")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!scan) {
      return new Response(JSON.stringify({ error: "No body scan data found. Complete a body scan first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMeasurements: Record<string, number> = {};
    const avg = (a: number | null, b: number | null) => (a != null && b != null) ? (a + b) / 2 : null;
    const chest = avg(scan.chest_min, scan.chest_max);
    const waist = avg(scan.waist_min, scan.waist_max);
    const hip = avg(scan.hip_min, scan.hip_max);
    const inseam = avg(scan.inseam_min, scan.inseam_max);
    const shoulder = avg(scan.shoulder_min, scan.shoulder_max);

    if (chest != null) userMeasurements.chest = chest;
    if (waist != null) userMeasurements.waist = waist;
    if (hip != null) userMeasurements.hip = hip;
    if (inseam != null) userMeasurements.inseam = inseam;
    if (shoulder != null) userMeasurements.shoulder = shoulder;

    // STEP 3 — Fetch size chart
    const { data: chart } = await supabase
      .from("brand_size_charts")
      .select("*")
      .eq("brand_slug", brand_slug)
      .eq("category", category)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!chart) {
      return new Response(JSON.stringify({ error: "Size chart not available for this brand and category yet." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sizeData: SizeEntry[] = Array.isArray(chart.size_data) ? chart.size_data as SizeEntry[] : [];
    if (sizeData.length === 0) {
      return new Response(JSON.stringify({ error: "Size chart has no size entries." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 4 — Score every size
    const weights = CATEGORY_WEIGHTS[category];
    const scored = sizeData.map((size) => {
      let totalScore = 0;
      let totalWeight = 0;

      for (const [measurement, weight] of Object.entries(weights)) {
        if (weight === 0) continue;
        const userVal = userMeasurements[measurement];
        if (userVal == null) continue;

        const minKey = `${measurement}_min` as keyof SizeEntry;
        const maxKey = `${measurement}_max` as keyof SizeEntry;
        const sMin = size[minKey] as number | undefined;
        const sMax = size[maxKey] as number | undefined;
        if (sMin == null || sMax == null) continue;

        const adjusted = applyFitOffset(userVal, fit);
        const mScore = scoreMeasurement(adjusted, sMin, sMax);
        totalScore += mScore * weight;
        totalWeight += weight;
      }

      const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      return { label: size.label, score: Number(finalScore.toFixed(4)) };
    }).sort((a, b) => b.score - a.score);

    // STEP 5 — Determine recommendation
    const best = scored[0];
    const second = scored.length > 1 ? scored[1] : null;

    let fitStatus: string;
    if (best.score >= 0.90) fitStatus = "true_to_size";
    else if (best.score >= 0.75) fitStatus = "good_fit";
    else if (best.score >= 0.60) fitStatus = "between_sizes";
    else fitStatus = "out_of_range";

    let secondOption: string | null = null;
    if (second && best.score - second.score < 0.15 && best.score >= 0.60 && second.score >= 0.60) {
      fitStatus = "between_sizes";
      secondOption = second.label;
    }

    let fitNotes: string;
    const brandName = chart.brand_name;
    switch (fitStatus) {
      case "true_to_size":
        fitNotes = `${best.label} is your size in ${brandName} ${category}.`;
        break;
      case "good_fit":
        fitNotes = `${best.label} fits well in ${brandName} ${category}.`;
        break;
      case "between_sizes":
        fitNotes = `You are between ${best.label} and ${secondOption || (second?.label ?? best.label)}. Size ${best.label} for a ${fit} fit.`;
        break;
      default:
        fitNotes = `Your measurements fall outside ${brandName}'s standard ${category} range. Check their extended sizing.`;
    }

    const allSizes = scored.map((s) => ({
      label: s.label,
      score: Number(s.score.toFixed(2)),
      fit_status: s.score >= 0.90 ? "true_to_size" : s.score >= 0.75 ? "good_fit" : s.score >= 0.60 ? "between_sizes" : "out_of_range",
    }));

    const confidence = Number(best.score.toFixed(2));

    // STEP 6 — Cache
    const snapshot = { ...userMeasurements, height: scan.height_cm };
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("size_recommendations_cache").upsert({
      user_id,
      brand_slug,
      category,
      recommended_size: best.label,
      confidence,
      fit_status: fitStatus,
      fit_notes: fitNotes,
      second_option: secondOption,
      chart_id: chart.id,
      measurements_snapshot: snapshot,
      expires_at: expiresAt,
    }, { onConflict: "user_id,brand_slug,category" });

    return new Response(JSON.stringify({
      recommended_size: best.label,
      confidence,
      fit_status: fitStatus,
      fit_notes: fitNotes,
      second_option: secondOption,
      fit_preference: fit,
      brand_slug,
      category,
      all_sizes: allSizes,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
