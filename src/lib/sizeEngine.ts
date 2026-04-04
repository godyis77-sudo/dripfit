import { supabase } from '@/integrations/supabase/client';
import type { FitPreference, MeasurementRange } from './types';

interface SizeChartRow {
  size_label: string;
  chest_min: number | null;
  chest_max: number | null;
  bust_min: number | null;
  bust_max: number | null;
  waist_min: number | null;
  waist_max: number | null;
  hip_min: number | null;
  hip_max: number | null;
  inseam_min: number | null;
  inseam_max: number | null;
  shoulder_min: number | null;
  shoulder_max: number | null;
  sleeve_min?: number | null;
  sleeve_max?: number | null;
  height_min?: number | null;
  height_max?: number | null;
  shoe_min?: number | null;
  shoe_max?: number | null;
}

interface InlineSizeChartRow {
  label?: string;
  size_label?: string;
  chest_min?: number | null;
  chest_max?: number | null;
  bust_min?: number | null;
  bust_max?: number | null;
  waist_min?: number | null;
  waist_max?: number | null;
  hip_min?: number | null;
  hip_max?: number | null;
  hips_min?: number | null;
  hips_max?: number | null;
  inseam_min?: number | null;
  inseam_max?: number | null;
  shoulder_min?: number | null;
  shoulder_max?: number | null;
  sleeve_min?: number | null;
  sleeve_max?: number | null;
  height_min?: number | null;
  height_max?: number | null;
  shoe_min?: number | null;
  shoe_max?: number | null;
  shoe_length_min?: number | null;
  shoe_length_max?: number | null;
}

export interface UserMeasurements {
  shoulder: MeasurementRange;
  chest: MeasurementRange;
  waist: MeasurementRange;
  hips: MeasurementRange;
  inseam: MeasurementRange;
  sleeve?: MeasurementRange;
  heightCm?: number;
}

// ── Fit offset only applies to circumference measurements ──
// Shoulder, inseam, sleeve, shoe_length are structural/anatomical — never adjusted.
const FIT_FRACTION: Record<FitPreference, number> = {
  fitted: -0.6,
  slim: -0.6,
  regular: 0,
  relaxed: 0.6,
};

// Measurements that should receive fit-preference offset (circumference only)
const FIT_ADJUSTABLE = new Set(['chest', 'waist', 'hips', 'hip']);

// ── Category-aware weighting ──
export const CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
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

const CATEGORY_ALIASES: Record<string, string> = {
  't-shirts': 'tops',
  tees: 'tops',
  shirts: 'tops',
  blouses: 'tops',
  sweaters: 'tops',
  hoodies: 'tops',
  fleece: 'tops',
  knitwear: 'tops',
  'tank-tops': 'tops',
  polos: 'tops',
  jeans: 'bottoms',
  shorts: 'bottoms',
  skirts: 'bottoms',
  trousers: 'pants',
  leggings: 'activewear',
  joggers: 'activewear',
  sweatpants: 'activewear',
  jackets: 'outerwear',
  coats: 'outerwear',
  parkas: 'outerwear',
  vests: 'outerwear',
  blazer: 'blazers',
  blazers: 'blazers',
  suit: 'suits',
  suits: 'suits',
  'sports-bras': 'activewear',
  dress: 'dresses',
  gowns: 'dresses_full',
  'maxi-dresses': 'dresses_full',
  rompers: 'dresses',
  jumpsuits: 'dresses',
  sneakers: 'footwear',
  shoes: 'footwear',
  boots: 'footwear',
  sandals: 'footwear',
};

const DEFAULT_WEIGHTS: Record<string, number> = {
  chest: 0.30, waist: 0.30, hip: 0.20, shoulder: 0.10, inseam: 0.10,
};

/**
 * Scores how well a single user measurement fits a size chart range.
 * Returns 0–1 (1 = perfect midpoint match), with graceful decay outside range.
 * Mirrors the server-side `scoreMeasurement` for consistency.
 */
export function scoreMeasurement(userVal: number, chartMin: number, chartMax: number): number {
  const mid = (chartMin + chartMax) / 2;
  const sigma = (chartMax - chartMin) / 2 || 1;
  const distance = Math.abs(userVal - mid);
  const base = Math.exp(-0.5 * (distance / sigma) ** 2);
  const position = (userVal - chartMin) / (chartMax - chartMin || 1);
  const easeBias = position <= 0.5 ? 0.02 : -0.02 * ((position - 0.5) / 0.5);
  return Math.max(0, Math.min(1, base + easeBias));
}

export function normalizeCategory(rawCategory?: string): string {
  const normalized = rawCategory?.toLowerCase().trim() ?? '';
  if (normalized in CATEGORY_WEIGHTS) return normalized;
  return CATEGORY_ALIASES[normalized] || 'tops';
}

/**
 * Resolves user measurement midpoint for a given key from UserMeasurements.
 */
export function getUserMid(user: UserMeasurements, key: string): number | null {
  if (key === 'height') {
    return user.heightCm ?? null;
  }
  const map: Record<string, MeasurementRange | undefined> = {
    chest: user.chest,
    waist: user.waist,
    hip: user.hips,
    hips: user.hips,
    shoulder: user.shoulder,
    inseam: user.inseam,
    sleeve: user.sleeve,
  };
  const range = map[key];
  if (!range) return null;
  return (range.min + range.max) / 2;
}

/**
 * Resolves chart min/max for a given measurement key from a SizeChartRow.
 */
// Default spread (cm) when only a single measurement point exists
const DEFAULT_SPREAD: Record<string, number> = {
  chest: 4, waist: 4, hip: 4, hips: 4, shoulder: 2,
  inseam: 3, sleeve: 2, height: 5, shoe_length: 0.5,
};

function normalizeInlineRow(row: InlineSizeChartRow): SizeChartRow {
  return {
    size_label: row.size_label ?? row.label ?? '',
    chest_min: row.chest_min ?? row.bust_min ?? null,
    chest_max: row.chest_max ?? row.bust_max ?? null,
    bust_min: row.bust_min ?? null,
    bust_max: row.bust_max ?? null,
    waist_min: row.waist_min ?? null,
    waist_max: row.waist_max ?? null,
    hip_min: row.hip_min ?? row.hips_min ?? null,
    hip_max: row.hip_max ?? row.hips_max ?? null,
    inseam_min: row.inseam_min ?? null,
    inseam_max: row.inseam_max ?? null,
    shoulder_min: row.shoulder_min ?? null,
    shoulder_max: row.shoulder_max ?? null,
    sleeve_min: row.sleeve_min ?? null,
    sleeve_max: row.sleeve_max ?? null,
    height_min: row.height_min ?? null,
    height_max: row.height_max ?? null,
    shoe_min: row.shoe_min ?? row.shoe_length_min ?? null,
    shoe_max: row.shoe_max ?? row.shoe_length_max ?? null,
  };
}

function calcGradeSteps(rows: SizeChartRow[], measurementKeys: string[]): Record<string, number> {
  const steps: Record<string, number> = {};

  for (const key of measurementKeys) {
    const midpoints = rows
      .map((row) => {
        const range = getChartRange(row, key);
        return range ? (range[0] + range[1]) / 2 : null;
      })
      .filter((value): value is number => value != null);

    if (midpoints.length < 2) continue;

    let totalGap = 0;
    for (let i = 1; i < midpoints.length; i++) {
      totalGap += Math.abs(midpoints[i] - midpoints[i - 1]);
    }

    steps[key] = totalGap / (midpoints.length - 1);
  }

  return steps;
}

function scoreChartRows(
  rows: SizeChartRow[],
  user: UserMeasurements,
  fit: FitPreference,
  rawCategory?: string,
  preferredShoeSize?: string,
): { label: string; score: number }[] {
  const category = normalizeCategory(rawCategory);

  if (category === 'footwear') {
    if (!preferredShoeSize) return rows.map((row) => ({ label: row.size_label, score: 0 }));
    return rows
      .map((row) => ({
        label: row.size_label,
        score: row.size_label.toLowerCase() === preferredShoeSize.toLowerCase() ? 1 : 0,
      }))
      .sort((a, b) => b.score - a.score);
  }

  const weights = CATEGORY_WEIGHTS[category] || DEFAULT_WEIGHTS;
  const adjustableKeys = Object.keys(weights).filter((key) => FIT_ADJUSTABLE.has(key));
  const gradeSteps = calcGradeSteps(rows, adjustableKeys);
  const fitFraction = FIT_FRACTION[fit] ?? 0;

  return rows
    .map((row) => {
      let totalScore = 0;
      let totalWeight = 0;

      for (const [measurementKey, weight] of Object.entries(weights)) {
        if (weight === 0) continue;

        const userMid = getUserMid(user, measurementKey);
        if (userMid == null) continue;

        const chartRange = getChartRange(row, measurementKey);
        if (!chartRange) continue;

        let adjusted = userMid;
        if (FIT_ADJUSTABLE.has(measurementKey) && fitFraction !== 0) {
          adjusted = userMid + fitFraction * (gradeSteps[measurementKey] ?? 0);
        }

        const mScore = scoreMeasurement(adjusted, chartRange[0], chartRange[1]);
        totalScore += mScore * weight;
        totalWeight += weight;
      }

      return {
        label: row.size_label,
        score: totalWeight > 0 ? Number((totalScore / totalWeight).toFixed(4)) : 0,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function getChartRange(row: SizeChartRow, key: string): [number, number] | null {
  const pairs: Record<string, [number | null | undefined, number | null | undefined]> = {
    chest: [row.chest_min ?? row.bust_min, row.chest_max ?? row.bust_max],
    waist: [row.waist_min, row.waist_max],
    hip: [row.hip_min, row.hip_max],
    hips: [row.hip_min, row.hip_max],
    shoulder: [row.shoulder_min, row.shoulder_max],
    inseam: [row.inseam_min, row.inseam_max],
    sleeve: [row.sleeve_min, row.sleeve_max],
    height: [row.height_min, row.height_max],
    shoe_length: [row.shoe_min, row.shoe_max],
  };
  const pair = pairs[key];
  if (!pair) return null;

  const [lo, hi] = pair;

  // Both values present — use as-is
  if (lo != null && hi != null) return [lo, hi];

  // Single-point data: infer a range using default spread
  const spread = DEFAULT_SPREAD[key] ?? 3;
  if (lo != null && hi == null) return [lo, lo + spread];
  if (lo == null && hi != null) return [hi - spread, hi];

  return null;
}

export function scoreSizeRow(
  row: SizeChartRow,
  user: UserMeasurements,
  fit: FitPreference,
  category?: string,
  preferredShoeSize?: string,
): number {
  return scoreChartRows([row], user, fit, category, preferredShoeSize)[0]?.score ?? 0;
}

export function recommendInlineChartSize(
  rawRows: InlineSizeChartRow[],
  user: UserMeasurements,
  fit: FitPreference,
  rawCategory?: string,
  preferredShoeSize?: string,
): { size: string; confidence: number } | null {
  const rows = rawRows
    .map(normalizeInlineRow)
    .filter((row) => row.size_label);

  if (rows.length === 0) return null;

  const scored = scoreChartRows(rows, user, fit, rawCategory, preferredShoeSize);
  if (scored.length === 0) return null;

  return {
    size: scored[0].label,
    confidence: scored[0].score,
  };
}

export interface SizeRecommendation {
  best: string;
  sizeDown: string;
  sizeUp: string;
  scores: { label: string; score: number }[];
}

export async function recommendSize(
  retailer: string,
  category: string,
  gender: string,
  user: UserMeasurements,
  fit: FitPreference,
): Promise<SizeRecommendation | null> {
  const { data: charts } = await supabase
    .from('size_charts')
    .select('id')
    .eq('retailer', retailer)
    .eq('category', category)
    .eq('gender', gender)
    .limit(1);

  if (!charts || charts.length === 0) return null;

  const { data: rows } = await supabase
    .from('size_chart_rows')
    .select('*')
    .eq('chart_id', charts[0].id);

  if (!rows || rows.length === 0) return null;

  const scored = scoreChartRows(rows as SizeChartRow[], user, fit, category);

  if (scored.length === 0) return null;

  const best = scored[0].label;

  // Physical size hierarchy for accurate neighbor mapping
  const sizeHierarchy = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];

  let sizeDown = best;
  let sizeUp = best;

  const hierarchyIndex = sizeHierarchy.indexOf(best.toUpperCase());

  if (hierarchyIndex !== -1) {
    if (hierarchyIndex > 0) sizeDown = sizeHierarchy[hierarchyIndex - 1];
    if (hierarchyIndex < sizeHierarchy.length - 1) sizeUp = sizeHierarchy[hierarchyIndex + 1];
  } else {
    // Fallback for non-standard sizes (European numbering, "One Size", etc.)
    sizeDown = scored.length > 1 ? scored[1].label : best;
    sizeUp = scored.length > 2 ? scored[2].label : best;
  }

  return { best, sizeDown, sizeUp, scores: scored };
}
