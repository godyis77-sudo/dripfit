## DripFit — Landing + Home Token & Copy Cleanup

Executes the 12 prompts from `DripFit_Final_Prompts.md`. Every change verified against current code. No structural rewrites, no component deletion, no duplicate `BottomTabBar`.

---

### BATCH 1 — Token hygiene

**L3 — `font-mono` → `type-data` sweep**
Replace `font-mono ... tracking-... uppercase` clusters with the single `type-data` utility across:
- `LandingStatsTicker.tsx` (lines 22, 27)
- `LandingHero.tsx` (line 30 — LIVE badge text)
- `LandingRootCause.tsx` (lines 24, 68, 76)
- `LandingCommunityVerdict.tsx` (line 24)
- `LandingMarket.tsx` (line 40)
- `LandingFeatures.tsx` (line 66)
- `LandingPricing.tsx` (line 74)
- `LandingHowItWorks.tsx` (lines 25, 56)

**L4 — LIVE badge hex cleanup** (`LandingHero.tsx` lines 27–28)
- Remove inline `style={{ backgroundColor: '#D4AE2A' }}` → use `bg-primary` className.
- Keep box-shadow inline but switch to `boxShadow: '0 0 6px hsl(var(--primary))'`.

---

### BATCH 2 — Copy updates

**L1 — Hero subline** (`LandingHero.tsx` ~line 56)
Replace current subline with: *"Scan once. Try on 9,000+ pieces. Sized across 186 brands. Community Verified Drip."* Keep all existing classes.

**L2 — Nav tagline** (`LandingNav.tsx`)
Wrap `<BrandLogo />` in `flex flex-col`; add desktop-only span beneath:
`hidden md:block text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 mt-0.5` — *"Try on anything. Sized by data. Styled by your community."*

**L7 — Problem section verification** (`LandingProblemCluster.tsx`)
Verify single-stat knockout format ("70%" + 3-question bridge). If still using old 3-card layout, replace per spec. If already correct, no-op.

**L8 — Community + testimonial polish**
- `LandingCommunity.tsx`: headline → *"Your Fit. Community Confirmed."* (italic gold accent on second clause).
- `LandingTestimonials.tsx`: replace oversized quote glyphs with `border-l-2 border-primary` on each card; add 32px circle avatar with initials (JK, MT, MD) using `border border-primary text-primary`.

**L9 — Style Assistant icon** (`LandingFeatures.tsx`)
If chat-bubble icon used for "AI Style Assistant", swap to `Sparkles` from lucide-react. Else no-op.

---

### BATCH 3 — Structural verification

**L5 — Stats ticker reconciliation** (`LandingStatsTicker.tsx`)
Current ticker already uses problem-framed proof points (return rates, $849.9B, etc.) — **likely no-op**. Verify and only change if it duplicates hero stats.

**L6 — Section anchors** (`Landing.tsx` + cluster components)
Verify `id="problem"`, `id="how-it-works"`, `id="proof"` (already exists), `id="pricing"` with `scroll-mt-20`. Add any missing.

---

### BATCH 4 — Home page

**H1 — Home header cleanup** (`Home.tsx`)
- Remove any tagline beneath `<BrandLogo />` if present.
- Replace hardcoded `text-white/70` and `border-white/20` on SIGN IN button (line 188) with `text-foreground/60 border-border`.
- Also clean up the gold gradient hex (`#C8A951` lines 212, 224) → `hsl(var(--primary))`.
- Replace `font-mono` (lines 172, 265, 292) and `text-white/X` (lines 280, 292) with `type-data` and `text-foreground/X`.
- **Do NOT add a `BottomTabBar`** — already mounted in `Welcome.tsx`.

**H2 — Swipe feed verification** (`SwipeFeedSection.tsx`)
Verify `useHomeSwipeFeed()` hook is the data source. Strip any mock arrays, hex colors, `font-mono` if found. Likely no-op.

**H3 — HomeFAB verification** (`HomeFAB.tsx`)
Verify exists, navigates to `/style-assistant`, uses `text-primary`/`bg-primary`. Likely no-op.

---

### Post-run verification

```
✓ rg "#D4AE2A|#C8A951|#D4AF37" src/components/  → zero matches
✓ rg "font-mono" src/components/landing/ src/components/home/Home.tsx → zero matches
✓ rg "text-white" src/components/landing/ src/components/home/Home.tsx → zero matches
✓ Pillar 2 still says "SIZED" (not "FITTED")
✓ Hero subline matches new copy exactly
✓ No second BottomTabBar on /home
✓ Nav tagline only visible md+
✓ All 4 nav anchors scroll correctly
```

### What this plan explicitly does NOT do

- Does not rebuild any section from scratch.
- Does not delete the phone mockup, `LandingNav` scroll-spy, or `useHomeSwipeFeed` hook.
- Does not add gradients, glows, or 3D effects (preserves flat design system).
- Does not touch authenticated-user logic, `WeeklyOutfitsSection`, or any data hook.
- Does not modify the `BottomTabBar` or its mount point.
