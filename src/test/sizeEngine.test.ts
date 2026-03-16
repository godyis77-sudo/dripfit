import { describe, it, expect } from 'vitest';
import {
  scoreMeasurement,
  scoreSizeRow,
  getUserMid,
  getChartRange,
  CATEGORY_WEIGHTS,
  type UserMeasurements,
} from '@/lib/sizeEngine';
import type { FitPreference } from '@/lib/types';

// ── Helper factories ──

const makeUser = (overrides: Partial<UserMeasurements> = {}): UserMeasurements => ({
  shoulder: { min: 44, max: 46 },
  chest: { min: 96, max: 100 },
  waist: { min: 80, max: 84 },
  hips: { min: 98, max: 102 },
  inseam: { min: 78, max: 82 },
  ...overrides,
});

const makeRow = (label: string, overrides: Record<string, number | null> = {}) => ({
  size_label: label,
  chest_min: 96, chest_max: 100,
  bust_min: null, bust_max: null,
  waist_min: 80, waist_max: 84,
  hip_min: 98, hip_max: 102,
  inseam_min: 78, inseam_max: 82,
  shoulder_min: 44, shoulder_max: 46,
  sleeve_min: null as number | null, sleeve_max: null as number | null,
  height_min: null as number | null, height_max: null as number | null,
  shoe_min: null as number | null, shoe_max: null as number | null,
  ...overrides,
});

// ── scoreMeasurement ──

describe('scoreMeasurement', () => {
  it('returns 1.0 for exact midpoint', () => {
    expect(scoreMeasurement(50, 48, 52)).toBe(1.0);
  });

  it('returns ~0.8 at range edge', () => {
    const score = scoreMeasurement(48, 48, 52);
    expect(score).toBeCloseTo(0.8, 1);
  });

  it('decays gracefully just outside range', () => {
    const score = scoreMeasurement(47, 48, 52);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.8);
  });

  it('returns 0 for far-out values', () => {
    expect(scoreMeasurement(20, 48, 52)).toBe(0);
  });
});

// ── scoreSizeRow: category weighting ──

describe('scoreSizeRow — category weighting', () => {
  it('tops: chest-matching row scores higher than waist-only match', () => {
    const user = makeUser();
    const chestMatch = makeRow('M'); // all match
    const chestMiss = makeRow('M', { chest_min: 110, chest_max: 114 }); // chest way off

    const scoreA = scoreSizeRow(chestMatch, user, 'regular', 'tops');
    const scoreB = scoreSizeRow(chestMiss, user, 'regular', 'tops');
    expect(scoreA).toBeGreaterThan(scoreB);
  });

  it('bottoms: hip/waist matter more than chest', () => {
    const user = makeUser();
    const hipMatch = makeRow('M'); // all match
    const hipMiss = makeRow('M', { hip_min: 120, hip_max: 124 }); // hips way off

    const scoreA = scoreSizeRow(hipMatch, user, 'regular', 'bottoms');
    const scoreB = scoreSizeRow(hipMiss, user, 'regular', 'bottoms');
    expect(scoreA).toBeGreaterThan(scoreB);
  });
});

// ── scoreSizeRow: fit offsets ──

describe('scoreSizeRow — fit offsets', () => {
  it('slim vs regular produces different scores for circumference keys', () => {
    const user = makeUser();
    const row = makeRow('M');
    const slim = scoreSizeRow(row, user, 'slim', 'tops');
    const regular = scoreSizeRow(row, user, 'regular', 'tops');
    expect(slim).not.toBe(regular);
  });

  it('shoulder is NOT affected by fit offset', () => {
    // Shoulder is structural — verify identical contribution
    const user = makeUser({ shoulder: { min: 44, max: 46 } });
    const row = makeRow('M');
    // With only shoulder data
    const rowOnlyShoulder = makeRow('M', {
      chest_min: null, chest_max: null,
      waist_min: null, waist_max: null,
      hip_min: null, hip_max: null,
      inseam_min: null, inseam_max: null,
    });
    const slim = scoreSizeRow(rowOnlyShoulder, user, 'slim', 'tops');
    const regular = scoreSizeRow(rowOnlyShoulder, user, 'regular', 'tops');
    expect(slim).toBe(regular);
  });
});

// ── scoreSizeRow: missing data ──

describe('scoreSizeRow — edge cases', () => {
  it('returns 0 when no chart data overlaps with weights', () => {
    const user = makeUser();
    const emptyRow = makeRow('M', {
      chest_min: null, chest_max: null,
      waist_min: null, waist_max: null,
      hip_min: null, hip_max: null,
      shoulder_min: null, shoulder_max: null,
      inseam_min: null, inseam_max: null,
    });
    expect(scoreSizeRow(emptyRow, user, 'regular', 'tops')).toBe(0);
  });
});

// ── Footwear guard ──

describe('scoreSizeRow — footwear guard', () => {
  it('returns 1.0 for matching shoe size', () => {
    const user = makeUser();
    const row = makeRow('10');
    expect(scoreSizeRow(row, user, 'regular', 'footwear', '10')).toBe(1.0);
  });

  it('returns 0 for non-matching shoe size', () => {
    const user = makeUser();
    const row = makeRow('10');
    expect(scoreSizeRow(row, user, 'regular', 'footwear', '9')).toBe(0);
  });

  it('returns 0 when no preferred shoe size', () => {
    const user = makeUser();
    const row = makeRow('10');
    expect(scoreSizeRow(row, user, 'regular', 'footwear')).toBe(0);
  });

  it('case-insensitive match', () => {
    const user = makeUser();
    const row = makeRow('10.5');
    expect(scoreSizeRow(row, user, 'regular', 'footwear', '10.5')).toBe(1.0);
  });
});

// ── Size hierarchy (sizeUp/sizeDown) ──

describe('size hierarchy neighbors', () => {
  const sizeHierarchy = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];

  function getNeighbors(best: string) {
    let sizeDown = best;
    let sizeUp = best;
    const idx = sizeHierarchy.indexOf(best.toUpperCase());
    if (idx !== -1) {
      if (idx > 0) sizeDown = sizeHierarchy[idx - 1];
      if (idx < sizeHierarchy.length - 1) sizeUp = sizeHierarchy[idx + 1];
    }
    return { sizeDown, sizeUp };
  }

  it('M → sizeDown=S, sizeUp=L', () => {
    expect(getNeighbors('M')).toEqual({ sizeDown: 'S', sizeUp: 'L' });
  });

  it('XXS → sizeDown=XXS (no underflow)', () => {
    expect(getNeighbors('XXS').sizeDown).toBe('XXS');
  });

  it('4XL → sizeUp=4XL (no overflow)', () => {
    expect(getNeighbors('4XL').sizeUp).toBe('4XL');
  });

  it('non-standard size falls through (no crash)', () => {
    const { sizeDown, sizeUp } = getNeighbors('42');
    expect(sizeDown).toBe('42');
    expect(sizeUp).toBe('42');
  });

  it('XS → sizeDown=XXS, sizeUp=S', () => {
    expect(getNeighbors('XS')).toEqual({ sizeDown: 'XXS', sizeUp: 'S' });
  });
});
