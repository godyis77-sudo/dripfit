

## Plan: Size Engine Hardening — Schema, Footwear Guard, and Unit Tests

### 1. Database Migration: Add columns to `size_chart_rows`

Add four nullable numeric columns:
- `sleeve_min`, `sleeve_max`, `height_min`, `height_max`

These columns already exist on the `SizeChartRow` TypeScript interface as optional fields but are missing from the actual database table, so the client-side engine silently skips them.

### 2. Add `preferred_shoe_size` to `profiles` table

Add a nullable `text` column `preferred_shoe_size` to the `profiles` table so users can store their shoe size for direct-match lookups.

### 3. Footwear Guard Clause in `scoreSizeRow`

Update `scoreSizeRow` in `src/lib/sizeEngine.ts`:
- Accept an optional `preferredShoeSize?: string` parameter
- If `category === 'footwear'`:
  - If no `preferredShoeSize` provided, return `0` (null match — UI prompts user)
  - Otherwise do a direct case-insensitive string match of `preferredShoeSize` against `row.size_label`, returning `1.0` for match, `0` for mismatch
- Skip Gaussian scoring entirely for footwear

### 4. Unit Tests: `src/test/sizeEngine.test.ts`

New test file covering:

**scoreSizeRow tests:**
- Tops category: chest-heavy weighting produces higher score when chest matches vs. when only waist matches
- Bottoms category: hip/waist-heavy weighting works correctly
- Fit offset: `slim` produces different score than `regular` for same measurements (circumference keys shift)
- Missing chart data gracefully returns 0

**Size hierarchy tests:**
- `M` → sizeDown = `S`, sizeUp = `L`
- `XXS` → sizeDown = `XXS` (no underflow)
- `4XL` → sizeUp = `4XL` (no overflow)
- Non-standard size (e.g. `"42"`) falls back gracefully

**Footwear guard tests:**
- `footwear` category with matching shoe size → score 1.0
- `footwear` category with non-matching shoe size → score 0
- `footwear` category with no shoe size → score 0

### 5. Files Changed

| File | Change |
|------|--------|
| Database migration | `ALTER TABLE size_chart_rows ADD COLUMN sleeve_min/max, height_min/max` |
| Database migration | `ALTER TABLE profiles ADD COLUMN preferred_shoe_size text` |
| `src/lib/sizeEngine.ts` | Add `preferredShoeSize` param to `scoreSizeRow`, footwear guard clause |
| `src/test/sizeEngine.test.ts` | New file — ~15 test cases |

### Technical Notes

- The `scoreSizeRow` and helper functions (`scoreMeasurement`, `getUserMid`, `getChartRange`) need to be exported for testing. Currently only `scoreSizeRow` and `CATEGORY_WEIGHTS` are exported — will add exports for the helpers.
- Tests will import directly from `src/lib/sizeEngine.ts` without mocking Supabase (only `scoreSizeRow` is pure; `recommendSize` won't be tested here since it hits the DB).
- The `profiles` column addition requires updating the `update_own_profile` security-definer function to accept a `p_preferred_shoe_size` parameter.

