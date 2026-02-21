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

interface UserMeasurements {
  shoulder: MeasurementRange;
  chest: MeasurementRange;
  waist: MeasurementRange;
  hips: MeasurementRange;
  inseam: MeasurementRange;
}

function overlapScore(userMin: number, userMax: number, chartMin: number | null, chartMax: number | null): number {
  if (chartMin == null || chartMax == null) return 0;
  const overlapStart = Math.max(userMin, chartMin);
  const overlapEnd = Math.min(userMax, chartMax);
  if (overlapStart >= overlapEnd) {
    // No overlap — penalty based on distance
    const gap = overlapStart - overlapEnd;
    return -gap;
  }
  const overlap = overlapEnd - overlapStart;
  const userRange = userMax - userMin;
  return userRange > 0 ? overlap / userRange : 1;
}

export function scoreSizeRow(row: SizeChartRow, user: UserMeasurements, fit: FitPreference): number {
  const fitOffset = fit === 'fitted' ? -2 : fit === 'relaxed' ? 2 : 0;

  const scores: number[] = [];

  // Chest/bust
  const chestMin = row.chest_min ?? row.bust_min;
  const chestMax = row.chest_max ?? row.bust_max;
  if (chestMin != null && chestMax != null) {
    scores.push(overlapScore(user.chest.min + fitOffset, user.chest.max + fitOffset, chestMin, chestMax));
  }

  // Waist
  if (row.waist_min != null && row.waist_max != null) {
    scores.push(overlapScore(user.waist.min + fitOffset, user.waist.max + fitOffset, row.waist_min, row.waist_max));
  }

  // Hips
  if (row.hip_min != null && row.hip_max != null) {
    scores.push(overlapScore(user.hips.min + fitOffset, user.hips.max + fitOffset, row.hip_min, row.hip_max));
  }

  // Inseam
  if (row.inseam_min != null && row.inseam_max != null) {
    scores.push(overlapScore(user.inseam.min, user.inseam.max, row.inseam_min, row.inseam_max));
  }

  // Shoulder
  if (row.shoulder_min != null && row.shoulder_max != null) {
    scores.push(overlapScore(user.shoulder.min + fitOffset, user.shoulder.max + fitOffset, row.shoulder_min, row.shoulder_max));
  }

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
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
    score: scoreSizeRow(r as SizeChartRow, user, fit),
  })).sort((a, b) => b.score - a.score);

  const bestIdx = 0;
  const best = scored[bestIdx].label;
  const sizeDown = scored[Math.min(bestIdx + 1, scored.length - 1)]?.label || best;
  const sizeUp = bestIdx > 0 ? scored[bestIdx - 1].label : best;

  return { best, sizeDown, sizeUp, scores: scored };
}
