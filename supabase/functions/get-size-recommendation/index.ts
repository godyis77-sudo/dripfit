import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";


interface SizeEntry {
  label: string;
  chest_min?: number; chest_max?: number;
  waist_min?: number; waist_max?: number;
  hip_min?: number; hip_max?: number;
  inseam_min?: number; inseam_max?: number;
  shoulder_min?: number; shoulder_max?: number;
  sleeve_min?: number; sleeve_max?: number;
  height_min?: number; height_max?: number;
  shoe_length_min?: number; shoe_length_max?: number;
}

// ── Category-aware weighting (mirrored in client sizeEngine.ts) ──
const CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
  tops:       { chest: 0.40, waist: 0.30, shoulder: 0.30 },
  bottoms:    { waist: 0.35, hip: 0.40, inseam: 0.25 },
  pants:      { waist: 0.35, hip: 0.35, inseam: 0.30 },
  dresses:      { chest: 0.30, waist: 0.35, hip: 0.35 },
  dresses_full: { chest: 0.25, waist: 0.30, hip: 0.30, height: 0.15 },
  outerwear:  { chest: 0.35, waist: 0.15, hip: 0.10, shoulder: 0.25, sleeve: 0.15 },
  blazers:    { chest: 0.30, waist: 0.15, shoulder: 0.25, sleeve: 0.20, hip: 0.10 },
  suits:      { chest: 0.25, waist: 0.20, shoulder: 0.20, sleeve: 0.15, hip: 0.10, inseam: 0.10 },
  activewear: { chest: 0.25, waist: 0.35, hip: 0.30, inseam: 0.10 },
  footwear:   { shoe_length: 1.00 },
};

// Fit preference: score with RAW measurements, then shift the pick on the
// chart's own size ladder. This avoids the boundary-distortion problem that
// measurement-offset approaches cause.
const FIT_SHIFT: Record<string, number> = {
  slim: -1,    // one position smaller → tighter fit
  regular: 0,
  relaxed: 1,  // one position larger  → looser fit
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 'AUTH_ERROR', 401, corsHeaders);
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse('Unauthorized', 'AUTH_ERROR', 401, corsHeaders);
    }

    const { user_id, brand_slug, category: rawCategory, fit_preference = "regular" } = await req.json();

    if (!user_id || !brand_slug || !rawCategory) {
      return errorResponse("user_id, brand_slug, and category are required.", "VALIDATION_ERROR", 400, corsHeaders);
    }

    // Verify the requested user_id matches the authenticated user
    if (user_id !== claimsData.claims.sub) {
      return errorResponse("Cannot access another user's data", "AUTH_ERROR", 403, corsHeaders);
    }

    const validFits = ["slim", "regular", "relaxed"];
    const fit = validFits.includes(fit_preference) ? fit_preference : "regular";

    // Map incoming category to a valid weight key, with fuzzy fallback
    const CATEGORY_ALIASES: Record<string, string> = {
      "t-shirts": "tops", "tees": "tops", "shirts": "tops", "blouses": "tops",
      "sweaters": "tops", "hoodies": "tops", "tank-tops": "tops", "polos": "tops",
      "jeans": "bottoms", "shorts": "bottoms", "skirts": "bottoms", "trousers": "pants",
      "leggings": "activewear", "joggers": "activewear", "sweatpants": "activewear",
      "jackets": "outerwear", "coats": "outerwear", "parkas": "outerwear", "vests": "outerwear",
      "blazer": "blazers", "suit": "suits", "sport-coats": "blazers",
      "sneakers": "footwear", "shoes": "footwear", "boots": "footwear", "sandals": "footwear",
      "dress": "dresses", "gowns": "dresses_full", "maxi-dresses": "dresses_full",
      "rompers": "dresses", "jumpsuits": "dresses",
    };
    const validCategories = Object.keys(CATEGORY_WEIGHTS);
    const normalised = rawCategory.toLowerCase().trim();
    const category = validCategories.includes(normalised)
      ? normalised
      : (CATEGORY_ALIASES[normalised] || "tops");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // STEP 1 — Check cache (includes fit_preference)
    const { data: cached } = await supabase
      .from("size_recommendations_cache")
      .select("*")
      .eq("user_id", user_id)
      .eq("brand_slug", brand_slug)
      .eq("category", category)
      .eq("fit_preference", fit)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (cached) {
      return successResponse({
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
      }, 200, corsHeaders);
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
      return errorResponse("No body scan data found. Complete a body scan first.", "NOT_FOUND", 400, corsHeaders);
    }

    const userMeasurements: Record<string, number> = {};
    const avg = (a: number | null, b: number | null) => (a != null && b != null) ? (a + b) / 2 : null;
    const chest = avg(scan.chest_min, scan.chest_max);
    const waist = avg(scan.waist_min, scan.waist_max);
    const hip = avg(scan.hip_min, scan.hip_max);
    const inseam = avg(scan.inseam_min, scan.inseam_max);
    const shoulder = avg(scan.shoulder_min, scan.shoulder_max);
    const sleeve = avg(scan.sleeve_min, scan.sleeve_max);

    if (chest != null) userMeasurements.chest = chest;
    if (waist != null) userMeasurements.waist = waist;
    if (hip != null) userMeasurements.hip = hip;
    if (inseam != null) userMeasurements.inseam = inseam;
    if (shoulder != null) userMeasurements.shoulder = shoulder;
    if (sleeve != null) userMeasurements.sleeve = sleeve;
    if (scan.height_cm != null) userMeasurements.height = scan.height_cm;

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
      return errorResponse("Size chart not available for this brand and category yet.", "NOT_FOUND", 404, corsHeaders);
    }

    const sizeData: SizeEntry[] = Array.isArray(chart.size_data) ? chart.size_data as SizeEntry[] : [];
    if (sizeData.length === 0) {
      return errorResponse("Size chart has no size entries.", "NOT_FOUND", 404, corsHeaders);
    }

    // STEP 4 — Score every size with RAW measurements (no fit offset)
    const weights = CATEGORY_WEIGHTS[category];

    const scored = sizeData.map((size) => {
      let totalScore = 0;
      let totalWeight = 0;
      const breakdown: { key: string; user_value: number; chart_min: number; chart_max: number; score: number; status: string }[] = [];

      for (const [measurement, weight] of Object.entries(weights)) {
        if (weight === 0) continue;
        const userVal = userMeasurements[measurement];
        if (userVal == null) continue;

        const minKey = `${measurement}_min` as keyof SizeEntry;
        const maxKey = `${measurement}_max` as keyof SizeEntry;
        const sMin = size[minKey] as number | undefined;
        const sMax = size[maxKey] as number | undefined;
        if (sMin == null || sMax == null) continue;

        const mScore = scoreMeasurement(userVal, sMin, sMax);
        totalScore += mScore * weight;
        totalWeight += weight;

        const mStatus = mScore >= 0.8 ? "match" : mScore >= 0.5 ? "close" : userVal < sMin ? "too_small" : userVal > sMax ? "too_large" : "out_of_range";
        breakdown.push({
          key: measurement,
          user_value: Number(userVal.toFixed(1)),
          chart_min: sMin,
          chart_max: sMax,
          score: Number(mScore.toFixed(2)),
          status: mStatus,
        });
      }

      const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      return { label: size.label, score: Number(finalScore.toFixed(4)), breakdown };
    }).sort((a, b) => b.score - a.score);

    // STEP 5 — Apply fit preference by shifting on the chart's own size order
    // The chart's sizeData array is ordered small→large, so we use its index.
    const sizeLabelsInOrder = sizeData.map(s => s.label);
    const bestRawLabel = scored[0].label;
    const bestRawIdx = sizeLabelsInOrder.indexOf(bestRawLabel);
    const shift = FIT_SHIFT[fit] ?? 0;
    const shiftedIdx = Math.max(0, Math.min(sizeLabelsInOrder.length - 1, bestRawIdx + shift));
    const shiftedLabel = sizeLabelsInOrder[shiftedIdx];

    // Find the shifted size's score info for breakdown, but use raw best's score for confidence
    const shiftedScored = scored.find(s => s.label === shiftedLabel) || scored[0];
    const rawBest = scored[0];
    // Use shifted label but raw best's confidence score (the measurement match quality doesn't change)
    const best = { ...shiftedScored, score: rawBest.score };

    // Second option: the raw best if we shifted, otherwise next-best
    let secondOption: string | null = null;
    if (shiftedLabel !== bestRawLabel) {
      secondOption = bestRawLabel; // "also consider your true-to-chart size"
    } else {
      const second = scored.length > 1 ? scored[1] : null;
      if (second && rawBest.score - second.score < 0.15 && rawBest.score >= 0.60 && second.score >= 0.60) {
        secondOption = second.label;
      }
    }

    let fitStatus: string;
    if (rawBest.score >= 0.90) fitStatus = "true_to_size";
    else if (rawBest.score >= 0.75) fitStatus = "good_fit";
    else if (rawBest.score >= 0.60) fitStatus = "between_sizes";
    else fitStatus = "out_of_range";

    // If we shifted AND raw was a decent fit, mark as between_sizes
    if (shiftedLabel !== bestRawLabel && rawBest.score >= 0.60) {
      fitStatus = "between_sizes";
    }

    let fitNotes: string;
    const brandName = chart.brand_name;
    const fitLabel = fit === "slim" ? "a slimmer" : fit === "relaxed" ? "a relaxed" : "a regular";

    if (shiftedLabel !== bestRawLabel) {
      fitNotes = `${shiftedLabel} for ${fitLabel} fit in ${brandName} ${category}. True-to-chart size is ${bestRawLabel}.`;
    } else {
      switch (fitStatus) {
        case "true_to_size":
          fitNotes = `${best.label} is your size in ${brandName} ${category}.`;
          break;
        case "good_fit":
          fitNotes = `${best.label} fits well in ${brandName} ${category}.`;
          break;
        case "between_sizes":
          fitNotes = `You are between ${best.label} and ${secondOption || (scored[1]?.label ?? best.label)}. Size ${best.label} for ${fitLabel} fit.`;
          break;
        default:
          fitNotes = `Your measurements fall outside ${brandName}'s standard ${category} range. Check their extended sizing.`;
      }
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
      fit_preference: fit,
      recommended_size: best.label,
      confidence,
      fit_status: fitStatus,
      fit_notes: fitNotes,
      second_option: secondOption,
      chart_id: chart.id,
      measurements_snapshot: snapshot,
      expires_at: expiresAt,
    }, { onConflict: "user_id,brand_slug,category,fit_preference" });

    return successResponse({
      recommended_size: best.label,
      confidence,
      fit_status: fitStatus,
      fit_notes: fitNotes,
      second_option: secondOption,
      fit_preference: fit,
      brand_slug,
      category,
      all_sizes: allSizes,
      measurement_breakdown: best.breakdown,
    }, 200, corsHeaders);

  } catch (e) {
    return errorResponse((e as Error).message || "Internal server error", "INTERNAL_ERROR", 500, getCorsHeaders(req));
  }
});
