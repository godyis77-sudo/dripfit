

# Landing Page — Layout Reorder Plan

Tighten the section order from 14 sections to 10 by following a clean **Pain → Cure → Proof → Buy** narrative. Removes redundant problem sections, consolidates social proof, and surfaces pricing earlier.

---

## Current order (14 sections)
1. Hero
2. Stats ticker
3. **How It Works** ← solution shown before problem
4. **The Problem** (stats + bar chart)
5. **Features**
6. Feature pills strip ← orphaned
7. **Live Community Verdict**
8. **Testimonials**
9. **Community**
10. **Root Cause** (donut) ← repeats problem
11. **Market** (line chart) ← repeats problem
12. **Pricing** ← buried
13. FAQ
14. Final CTA

---

## Proposed order (10 sections)
1. Hero
2. Stats ticker
3. **THE PROBLEM** *(consolidated cluster: inline stats + bar chart → donut → line chart)*
4. **HOW IT WORKS**
5. **FEATURES**
6. **PROOF** *(Live Verdict + Testimonials + Community grid, back-to-back)*
7. **PRICING**
8. FAQ
9. Final CTA
10. Footer

---

## Execution passes

### Pass 1 — Reorder (zero content changes)
**File:** `src/pages/Landing.tsx`

- Move `LandingHowItWorks` → after the inline "The Problem" cluster
- Move `LandingRootCause` → directly after inline Problem section
- Move `LandingMarket` → directly after `LandingRootCause`
- Move `LandingPricing` → after `LandingCommunity` (right before FAQ)

### Pass 2 — Delete orphaned pills strip
**File:** `src/pages/Landing.tsx`

Remove the `PROOF_TAGS` border-y strip (lines ~215–221) and the `PROOF_TAGS` constant. Info already lives inside `LandingFeatures`.

### Pass 3 — Trim Problem cluster padding
**Files:** `LandingRootCause.tsx`, `LandingMarket.tsx`

When stacked back-to-back with the inline Problem section, reduce top padding so they read as one continuous Problem narrative, not three full-page beats.
- `py-20 md:py-24` → `pt-10 md:pt-14 pb-20 md:pb-24`

### Pass 4 — Verify Proof cluster eyebrows
**File:** `src/pages/Landing.tsx` (verify only)

Confirm `LandingCommunityVerdict`, `LandingTestimonials`, `LandingCommunity` each have distinct eyebrows (e.g., "LIVE", "REVIEWS", "THE FEED") so the back-to-back stack reads as one Proof block with three angles. Only edit if missing.

---

## Held / Out of scope
- Hero copy, stats ticker copy — locked
- Merging Live Verdict + Testimonials into one component — separate pass
- Component internals beyond padding/eyebrow tweaks
- Color tokens, fonts, animation easing

---

## Risk

| Pass | Risk | Why |
|---|---|---|
| 1 | Low | Pure JSX reordering |
| 2 | Low | Delete orphaned strip + unused constant |
| 3 | Low | CSS-only padding |
| 4 | Low | Verify-only, edit only if needed |

**Net result:** ~30% shorter scroll, cleaner narrative, pricing visible 4 sections earlier.

