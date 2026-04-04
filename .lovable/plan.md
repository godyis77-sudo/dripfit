

# Accuracy & Proficiency Audit Plan

## Current State Assessment

After reviewing all core functions, here is what is working well and what needs improvement across the four pillars:

---

## 1. Body Measurement Capture (`analyze-body`)

**What's good:**
- Uses `google/gemini-2.5-pro` (strongest reasoning model) for measurement estimation
- Dual-photo approach (front + side) with known height as scale anchor
- Returns ranges, not exact numbers (realistic uncertainty)
- Reference object calibration support

**Issues to fix:**
- **Model upgrade**: `gemini-2.5-pro` is no longer the best option. `google/gemini-3.1-pro-preview` offers stronger visual reasoning and should produce more accurate landmark detection.
- **Missing bust/sleeve distinction**: The prompt asks for bust vs chest separately but the validation schema (`AnalyzeBodySchema`) doesn't enforce the AI returns both. The system prompt should clarify: for male-presenting bodies, bust = chest.
- **No cross-validation**: The AI could return physically impossible ranges (e.g., waist > chest). Add a post-processing sanity check that flags or auto-corrects impossible ratios.
- **Fit preference mismatch**: The `AnalyzeBodySchema` accepts `"fitted"` but the size engine uses `"slim"` as the equivalent. This inconsistency can cause the fit preference to be silently ignored.

---

## 2. Size Recommendation Engine (`sizeEngine.ts` + `get-size-recommendation`)

**What's good:**
- Gaussian scoring model with ease bias (well-designed)
- Category-aware weights with extensive alias mapping
- Grade-step approach for fit adjustments (dynamic, brand-specific)
- Server and client logic are now aligned
- 30-day caching with snapshot

**Issues to fix:**
- **Single-point data still under-utilized**: `getChartRange` uses `DEFAULT_SPREAD` when only `_min` exists, but the scraper's normalized output already maps `hips_min` to `hip_min`. The spread values (e.g., 4cm for chest) are arbitrary; better to use the brand's own grade step when available.
- **Missing `sleeve` weight in bottoms/dresses**: Currently sleeve data is ignored for those categories, which is correct, but `outerwear` and `blazers` weights don't sum to 1.0 (they sum to 1.0 which is good). No issue here actually.
- **Confidence thresholds too aggressive on server**: The server uses `>=0.90` for "true_to_size" but with Gaussian decay, scoring 0.90+ requires near-perfect midpoint alignment. Lower to `>=0.82` for "true_to_size" and `>=0.65` for "good_fit" to produce more realistic green/amber distributions.
- **Client-server parity for `DEFAULT_SPREAD`**: The server (`get-size-recommendation`) doesn't use `DEFAULT_SPREAD` — it skips measurements where `sMin == null || sMax == null`. This means the server is stricter than the client, producing different results.

---

## 3. Size Chart Scraping (`scrape-size-charts`)

**What's good:**
- Firecrawl + raw fetch fallback
- AI extraction with `gemini-2.5-flash` (fast, cost-efficient)
- HTML caching per URL to avoid re-fetching
- JSON repair for truncated responses
- Extended sizing support (tall, petite, plus)

**Issues to fix:**
- **Missing `sleeve_min`/`sleeve_max` in extraction prompt**: The AI prompt asks for `shoe_length_min/max` but not `sleeve_min/max` or `height_min/max` explicitly in the JSON schema template. This means sleeve data is rarely extracted even when available.
- **No `bust_min`/`bust_max` extraction**: The prompt schema doesn't include bust measurements, which are critical for women's tops/dresses. Should be added.
- **Hardcoded confidence of 0.8**: All scraped charts get `confidence: 0.8` regardless of extraction quality. Should be dynamic based on how many measurement fields were populated.
- **No validation of extracted values**: The AI could return inches instead of cm despite the prompt asking for cm. Add a sanity check (e.g., if chest_min < 30, likely inches — multiply by 2.54).

---

## 4. Virtual Try-On Image Generation (`virtual-tryon`)

**What's good:**
- Extremely sophisticated multi-layer routing (standard, intimate, footwear, accessory, belt, set)
- 3-layer fallback: primary model → compliance retry → text-bridge
- Garment extraction + AI description for intimate items
- Budget-aware timeout management
- Sanitization pipeline for safety filter bypass

**Issues to fix:**
- **Model selection**: The primary model `google/gemini-3.1-flash-image-preview` is good, but the fallback `google/gemini-3-pro-image-preview` is slower. The new `google/gemini-3.1-flash-image-preview` should remain primary; swap the pro fallback for a second flash attempt with a reworded prompt before escalating to pro.
- **No image compression before sending**: User photos can be up to 15MB base64. The function doesn't resize/compress before sending to the AI, wasting latency and tokens. Pre-resize to ~1200px max edge would cut request size by 60-80%.
- **Outerwear vest detection regex could miss "puffer vest"** — actually it already handles it. No issue here.

---

## Implementation Plan

### Step 1: Upgrade body scan model and add sanity checks
- Change `analyze-body` model from `google/gemini-2.5-pro` to `google/gemini-3.1-pro-preview`
- Add post-AI sanity checks: waist < chest, shoulder < chest, inseam < heightCm * 0.55
- Fix fit preference enum mismatch (`fitted` → `slim` mapping)

### Step 2: Align size recommendation confidence thresholds
- Update `get-size-recommendation` server function thresholds: `true_to_size ≥ 0.82`, `good_fit ≥ 0.65`, `between_sizes ≥ 0.45`
- Add `DEFAULT_SPREAD` logic to server to match client behavior (handle single-point data)
- Update client `SizeComparison.tsx` confidence dot thresholds to match

### Step 3: Improve scraper extraction schema
- Add `sleeve_min`, `sleeve_max`, `bust_min`, `bust_max`, `height_min`, `height_max` to the extraction prompt JSON template
- Add unit sanity check: if any circumference value < 30, assume inches and multiply by 2.54
- Calculate dynamic confidence based on field population rate

### Step 4: Optimize try-on image pipeline
- Add server-side image resizing (resize base64 to max 1200px edge before AI call) using canvas/Deno image APIs
- Reorder fallback: use `gemini-3.1-flash-image-preview` with reworded prompt as second attempt before `gemini-3-pro-image-preview`

### Step 5: End-to-end parity validation
- Ensure `sizeEngine.ts` (client) and `get-size-recommendation` (server) produce identical scores for the same inputs
- Add the missing `DEFAULT_SPREAD` and `normalizeInlineRow` logic to the server function

---

## Technical Details

**Files to modify:**
- `supabase/functions/analyze-body/index.ts` — model upgrade + sanity checks
- `supabase/functions/_shared/validation.ts` — fix `fitted`/`slim` enum alignment
- `supabase/functions/get-size-recommendation/index.ts` — threshold tuning + DEFAULT_SPREAD
- `supabase/functions/scrape-size-charts/index.ts` — extraction schema + unit validation
- `supabase/functions/virtual-tryon/index.ts` — fallback reorder
- `src/pages/SizeComparison.tsx` — confidence thresholds alignment
- `src/lib/sizeEngine.ts` — no changes needed (already well-structured)

