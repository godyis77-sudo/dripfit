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

// Canonical size order for sorting labels in text
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
function sizeIndex(label: string): number {
  const idx = SIZE_ORDER.indexOf(label.toUpperCase());
  return idx === -1 ? 999 : idx;
}

// ── Category-aware weighting ──
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

// Measurements eligible for fit-preference offset (circumference only).
const FIT_ADJUSTABLE = new Set(["chest", "waist", "hip"]);

// Fraction of the brand's own inter-size grade step to apply as offset.
// 0.40 = 40% of one full size step.
const FIT_FRACTION: Record<string, number> = {
  slim: -0.60,    // subtract 60% of grade step → tighter
  regular: 0,
  relaxed: 0.60,  // add 60% of grade step → looser
};

/**
 * Calculate the average midpoint gap between adjacent sizes for each
 * measurement key. Returns per-measurement average cm jump.
 */
function calcGradeSteps(sizeData: SizeEntry[], measurementKeys: string[]): Record<string, number> {
  const steps: Record<string, number> = {};
  for (const key of measurementKeys) {
    const minK = `${key}_min` as keyof SizeEntry;
    const maxK = `${key}_max` as keyof SizeEntry;
    const midpoints: number[] = [];
    for (const s of sizeData) {
      const lo = s[minK] as number | undefined;
      const hi = s[maxK] as number | undefined;
      if (lo != null && hi != null) midpoints.push((lo + hi) / 2);
    }
    if (midpoints.length >= 2) {
      let totalGap = 0;
      for (let i = 1; i < midpoints.length; i++) totalGap += Math.abs(midpoints[i] - midpoints[i - 1]);
      steps[key] = totalGap / (midpoints.length - 1);
    }
  }
  return steps;
}

function scoreMeasurement(userVal: number, min: number, max: number): number {
  const mid = (min + max) / 2;
  const sigma = (max - min) / 2 || 1;
  const distance = Math.abs(userVal - mid);
  const base = Math.exp(-0.5 * (distance / sigma) ** 2);
  // Ease bias: slight bonus when user sits in the lower half of the range
  // (more room = more comfortable). Penalty when squeezed at the top.
  const position = (userVal - min) / (max - min || 1); // 0=at min, 1=at max
  const easeBias = position <= 0.5 ? 0.02 : -0.02 * ((position - 0.5) / 0.5);
  return Math.max(0, Math.min(1, base + easeBias));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 'AUTH_ERROR', 401, corsHeaders);
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !userData?.user) {
      return errorResponse('Unauthorized', 'AUTH_ERROR', 401, corsHeaders);
    }

    const { user_id, brand_slug, category: rawCategory, fit_preference = "regular" } = await req.json();

    if (!user_id || !brand_slug || !rawCategory) {
      return errorResponse("user_id, brand_slug, and category are required.", "VALIDATION_ERROR", 400, corsHeaders);
    }

    if (user_id !== claimsData.claims.sub) {
      return errorResponse("Cannot access another user's data", "AUTH_ERROR", 403, corsHeaders);
    }

    const validFits = ["slim", "regular", "relaxed"];
    const fit = validFits.includes(fit_preference) ? fit_preference : "regular";

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

    // STEP 1 — Check cache
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

    // STEP 2 — User measurements
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

    // Fetch preferred shoe size from profile (for footwear guard)
    let preferredShoeSize: string | null = null;
    if (category === "footwear") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_shoe_size")
        .eq("user_id", user_id)
        .maybeSingle();
      preferredShoeSize = profile?.preferred_shoe_size ?? null;
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

    // STEP 3 — Size chart
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

    // STEP 4 — Calculate brand-specific grade steps & fit offset
    const weights = CATEGORY_WEIGHTS[category];
    const adjustableKeys = Object.keys(weights).filter(k => FIT_ADJUSTABLE.has(k));
    const gradeSteps = calcGradeSteps(sizeData, adjustableKeys);
    const fitFraction = FIT_FRACTION[fit] ?? 0;

    // Log grade steps for debugging
    console.log(`[size-rec] ${brand_slug}/${category} grade steps:`, JSON.stringify(gradeSteps), `fit: ${fit}, fraction: ${fitFraction}`);

    // ── FOOTWEAR GUARD: skip Gaussian scoring, do direct string match ──
    if (category === "footwear") {
      if (!preferredShoeSize) {
        return successResponse({
          recommended_size: null,
          confidence: 0,
          fit_status: "no_shoe_size",
          fit_notes: "Set your preferred shoe size in your profile to get footwear recommendations.",
          second_option: null,
          fit_preference: fit,
          brand_slug,
          category,
          all_sizes: sizeData.map(s => ({ label: s.label, score: 0, fit_status: "out_of_range" })),
          measurement_breakdown: [],
        }, 200, corsHeaders);
      }

      const matched = sizeData.find(s => s.label.toLowerCase() === preferredShoeSize.toLowerCase());
      const allSizes = sizeData.map(s => ({
        label: s.label,
        score: s.label.toLowerCase() === preferredShoeSize.toLowerCase() ? 1.0 : 0,
        fit_status: s.label.toLowerCase() === preferredShoeSize.toLowerCase() ? "true_to_size" : "out_of_range",
      }));

      const recSize = matched ? matched.label : preferredShoeSize;
      const conf = matched ? 1.0 : 0;
      const fStatus = matched ? "true_to_size" : "out_of_range";
      const fNotes = matched
        ? `${recSize} is your size in ${chart.brand_name} footwear.`
        : `Your shoe size (${preferredShoeSize}) is not available in ${chart.brand_name}'s size chart.`;

      // Cache footwear result
      const snapshot = { ...userMeasurements, height: scan.height_cm, preferred_shoe_size: preferredShoeSize };
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("size_recommendations_cache").upsert({
        user_id, brand_slug, category, fit_preference: fit,
        recommended_size: recSize, confidence: conf, fit_status: fStatus,
        fit_notes: fNotes, second_option: null, chart_id: chart.id,
        measurements_snapshot: snapshot, expires_at: expiresAt,
      }, { onConflict: "user_id,brand_slug,category,fit_preference" });

      return successResponse({
        recommended_size: recSize, confidence: conf, fit_status: fStatus,
        fit_notes: fNotes, second_option: null, fit_preference: fit,
        brand_slug, category, all_sizes: allSizes, measurement_breakdown: [],
      }, 200, corsHeaders);
    }

    // STEP 5 — Two-pass scoring:
    //  Pass A: RAW measurements → determines confidence & breakdown (what user actually matches)
    //  Pass B: FIT-ADJUSTED measurements → determines which size to recommend
    function scoreAllSizes(offset: number) {
      return sizeData.map((size) => {
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

          let adjusted = userVal;
          if (FIT_ADJUSTABLE.has(measurement) && offset !== 0) {
            const step = gradeSteps[measurement] ?? 0;
            adjusted = userVal + offset * step;
          }

          const mScore = scoreMeasurement(adjusted, sMin, sMax);
          totalScore += mScore * weight;
          totalWeight += weight;

          const mStatus = mScore >= 0.8 ? "match" : mScore >= 0.5 ? "close" : adjusted < sMin ? "too_small" : adjusted > sMax ? "too_large" : "out_of_range";
          breakdown.push({ key: measurement, user_value: Number(adjusted.toFixed(1)), chart_min: sMin, chart_max: sMax, score: Number(mScore.toFixed(2)), status: mStatus });
        }

        const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        return { label: size.label, score: Number(finalScore.toFixed(4)), breakdown };
      }).sort((a, b) => b.score - a.score);
    }

    // Pass A: raw scores (for confidence display)
    const rawScored = scoreAllSizes(0);
    // Pass B: fit-adjusted scores (for size selection)
    const fitScored = scoreAllSizes(fitFraction);

    const bestFit = fitScored[0]; // the recommended size (fit-adjusted)
    const secondFit = fitScored.length > 1 ? fitScored[1] : null;

    // Confidence comes from FIT-ADJUSTED score (reflects how well this size
    // serves the user's chosen fit preference, not just raw measurement match)
    const confidence = Number(bestFit.score.toFixed(2));
    // Breakdown from raw (shows true measurement position vs chart)
    const rawMatchForBest = rawScored.find(s => s.label === bestFit.label) || rawScored[0];
    const breakdown = rawMatchForBest.breakdown;

    // fitStatus based on fit-adjusted confidence
    let fitStatus: string;
    if (confidence >= 0.90) fitStatus = "true_to_size";
    else if (confidence >= 0.75) fitStatus = "good_fit";
    else if (confidence >= 0.50) fitStatus = "between_sizes";
    else fitStatus = "out_of_range";

    // Determine second option from fit-adjusted scores
    let secondOption: string | null = null;
    const fitSecond = fitScored.length > 1 ? fitScored[1] : null;
    if (fitSecond && Math.abs(bestFit.score - fitSecond.score) < 0.15 && fitSecond.score >= 0.45) {
      fitStatus = "between_sizes";
      secondOption = fitSecond.label;
    }

    // Sort the two size labels in ascending size order for display
    const sortedPair = secondOption
      ? [bestFit.label, secondOption].sort((a, b) => sizeIndex(a) - sizeIndex(b))
      : [bestFit.label, secondFit?.label ?? bestFit.label].sort((a, b) => sizeIndex(a) - sizeIndex(b));

    let fitNotes: string;
    const brandName = chart.brand_name;
    const fitLabel = fit === "slim" ? "a slimmer" : fit === "relaxed" ? "a relaxed" : "your best";
    // Only average keys that actually have grade step data
    const keysWithData = adjustableKeys.filter(k => gradeSteps[k] != null && gradeSteps[k] > 0);
    const avgStep = keysWithData.length > 0
      ? keysWithData.reduce((sum, k) => sum + gradeSteps[k], 0) / keysWithData.length
      : 0;
    const offsetCm = Math.abs(fitFraction * avgStep);
    const offsetNote = fitFraction !== 0 && offsetCm > 0.1 ? ` (${offsetCm.toFixed(1)}cm ${fit === "slim" ? "tighter" : "looser"} than true-to-size)` : "";

    switch (fitStatus) {
      case "true_to_size":
        fitNotes = `${bestFit.label} is your size in ${brandName} ${category}${offsetNote}.`;
        break;
      case "good_fit":
        fitNotes = `${bestFit.label} fits well in ${brandName} ${category}${offsetNote}.`;
        break;
      case "between_sizes":
        fitNotes = `You are between ${sortedPair[0]} and ${sortedPair[1]}. Size ${bestFit.label} for ${fitLabel} fit${offsetNote}.`;
        break;
      default:
        fitNotes = `Your measurements fall outside ${brandName}'s standard ${category} range${offsetNote}. Check their extended sizing.`;
    }

    // allSizes uses RAW scores for honest display
    const allSizes = rawScored.map((s) => ({
      label: s.label,
      score: Number(s.score.toFixed(2)),
      fit_status: s.score >= 0.90 ? "true_to_size" : s.score >= 0.75 ? "good_fit" : s.score >= 0.60 ? "between_sizes" : "out_of_range",
    }));

    // STEP 7 — Cache
    const snapshot = { ...userMeasurements, height: scan.height_cm };
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("size_recommendations_cache").upsert({
      user_id,
      brand_slug,
      category,
      fit_preference: fit,
      recommended_size: bestFit.label,
      confidence,
      fit_status: fitStatus,
      fit_notes: fitNotes,
      second_option: secondOption,
      chart_id: chart.id,
      measurements_snapshot: snapshot,
      expires_at: expiresAt,
    }, { onConflict: "user_id,brand_slug,category,fit_preference" });

    return successResponse({
      recommended_size: bestFit.label,
      confidence,
      fit_status: fitStatus,
      fit_notes: fitNotes,
      second_option: secondOption,
      fit_preference: fit,
      brand_slug,
      category,
      all_sizes: allSizes,
      measurement_breakdown: breakdown,
      _debug_grade_steps: gradeSteps,
      _debug_offset_cm: offsetCm,
    }, 200, corsHeaders);

  } catch (e) {
    return errorResponse((e as Error).message || "Internal server error", "INTERNAL_ERROR", 500, getCorsHeaders(req));
  }
});
