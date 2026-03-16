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
const FIT_OFFSETS: Record<string, number> = {
  fitted: -1.5,
  slim: -1.5,
  regular: 0,
  relaxed: 2,
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

const DEFAULT_WEIGHTS: Record<string, number> = {
  chest: 0.30, waist: 0.30, hip: 0.20, shoulder: 0.10, inseam: 0.10,
};

/**
 * Scores how well a single user measurement fits a size chart range.
 * Returns 0–1 (1 = perfect midpoint match), with graceful decay outside range.
 * Mirrors the server-side `scoreMeasurement` for consistency.
 */
function scoreMeasurement(userVal: number, chartMin: number, chartMax: number): number {
  const mid = (chartMin + chartMax) / 2;
  const rangeHalf = (chartMax - chartMin) / 2 || 1;

  if (userVal >= chartMin && userVal <= chartMax) {
    // Inside range: 0.8–1.0 depending on proximity to midpoint
    return 1.0 - (Math.abs(userVal - mid) / rangeHalf) * 0.2;
  }
  if (userVal < chartMin) {
    return Math.max(0, 1.0 - ((chartMin - userVal) / rangeHalf) * 0.8);
  }
  return Math.max(0, 1.0 - ((userVal - chartMax) / rangeHalf) * 0.8);
}

/**
 * Resolves user measurement midpoint for a given key from UserMeasurements.
 */
function getUserMid(user: UserMeasurements, key: string): number | null {
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
function getChartRange(row: SizeChartRow, key: string): [number, number] | null {
  const pairs: Record<string, [number | null, number | null]> = {
    chest: [row.chest_min ?? row.bust_min, row.chest_max ?? row.bust_max],
    waist: [row.waist_min, row.waist_max],
    hip: [row.hip_min, row.hip_max],
    hips: [row.hip_min, row.hip_max],
    shoulder: [row.shoulder_min, row.shoulder_max],
    inseam: [row.inseam_min, row.inseam_max],
  };
  const pair = pairs[key];
  if (!pair || pair[0] == null || pair[1] == null) return null;
  return [pair[0], pair[1]];
}

export function scoreSizeRow(
  row: SizeChartRow,
  user: UserMeasurements,
  fit: FitPreference,
  category?: string,
): number {
  const fitOffset = FIT_OFFSETS[fit] ?? 0;
  const weights = (category && CATEGORY_WEIGHTS[category]) || DEFAULT_WEIGHTS;

  let totalScore = 0;
  let totalWeight = 0;

  for (const [measurementKey, weight] of Object.entries(weights)) {
    if (weight === 0) continue;

    const userMid = getUserMid(user, measurementKey);
    if (userMid == null) continue;

    const chartRange = getChartRange(row, measurementKey);
    if (!chartRange) continue;

    // Only apply fit offset to circumference measurements
    const adjusted = FIT_ADJUSTABLE.has(measurementKey) ? userMid + fitOffset : userMid;
    const mScore = scoreMeasurement(adjusted, chartRange[0], chartRange[1]);

    totalScore += mScore * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
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

  const scored = rows.map(r => ({
    label: r.size_label,
    score: scoreSizeRow(r as SizeChartRow, user, fit, category),
  })).sort((a, b) => b.score - a.score);

  const bestIdx = 0;
  const best = scored[bestIdx].label;
  const sizeDown = scored[Math.min(bestIdx + 1, scored.length - 1)]?.label || best;
  const sizeUp = bestIdx > 0 ? scored[bestIdx - 1].label : best;

  return { best, sizeDown, sizeUp, scores: scored };
}
