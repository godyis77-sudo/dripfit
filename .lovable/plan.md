

# Landing Page Audit — Execution Plan

Approved scope: **A, B, C, D, E, G, H** (holding I per your default). Executed in dependency order so each pass leaves the page in a coherent state.

---

## Execution Order

### Pass 1 — Copy purge (A)
**Why first:** Pure text edits, zero layout risk, unblocks accurate review of subsequent visual fixes.

Files: `LandingFeatures.tsx`, `LandingHowItWorks.tsx`, `LandingFinalCTA.tsx`

| Before | After |
|---|---|
| "Your Body. Mapped." | "Your Body. Verified." |
| "geometry — mapped... Locked." | "geometry — measured. Cross-referenced against 186 brand size charts. Verified." |
| "Your mapped size across every brand" | "Your verified size across every brand" |
| "Your geometry — locked." | "Your measurements — verified." |
| "Verified. Mapped." | "Verified. Confirmed." |
| "Map your body" (Final CTA) | "Scan your body" |
| "AI that maps your taste" | "AI that learns your taste" |

---

### Pass 2 — Data accuracy fixes (B + C)
**Why second:** Trust-critical. Wrong numbers undermine the brand voice before any UI polish matters.

- **B — `LandingMarket.tsx`:** Headline "$1.16 Trillion" → **"$1.01 Trillion."** with subtitle **"Projected $1.16T by 2030. Returns are eating it."**
- **C — `LandingPricing.tsx`:** Free tier "30 Drape try-ons per month" → **"3 try-ons per month"** (matches monetization memory)

---

### Pass 3 — Spacing + contrast (D + E)
**Why third:** Both touch the bottom-of-page conversion zone. Bundling them lets us verify the FAQ → Pricing → Final CTA rhythm in one screenshot pass.

- **D — `LandingFinalCTA.tsx`:** `py-20 md:py-24` → `py-14 md:py-16`
- **E — `LandingPricing.tsx` Free CTA:** `bg-[#1A1A1A] text-white border border-zinc-700` → `bg-transparent text-foreground border border-primary/40 hover:bg-primary/10`

---

### Pass 4 — Footer (G)
**Why fourth:** Isolated, low-risk. Quick win.

- `Landing.tsx` footer: "Discover styles. Verify size. Drip checked. © 2026" → **"DripFit — Know your fit. © 2026"**

---

### Pass 5 — Phone mockup regeneration (H)
**Why last:** Image asset regeneration is the highest-risk step (AI output is non-deterministic and may need iteration). Doing it last means a failed/imperfect regen doesn't block the other 6 fixes from shipping.

Regenerate `src/assets/hero-phone-mockup.jpg` with explicit instructions:
- Replace **every** "XX%" with realistic percentages (88–96% range)
- Fix **"Antthropologie"** → **"Anthropologie"**
- Fix **"COHEMAN"** → **"CASUAL"**
- Remove **"Ai"** watermark from Abercrombie card top-left
- Preserve gold-on-black aesthetic, card layout, typography

After generation: visual QA against the screenshot to confirm all 4 fixes landed before saving.

---

## Held for follow-up
- **I — Consolidate Root Cause + Market into one "The Problem" block.** Bigger structural change, deserves its own pass with before/after screenshots so you can approve the merged layout.
- **F — Donut subtitle clipping.** Was in original review but not in your approved set. Flag if you want it added.

---

## Out of scope
Hero copy, CTA hierarchy, section order, fonts, color tokens, animation easing, component internals beyond the listed edits.

