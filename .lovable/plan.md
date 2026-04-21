

# Problem Section — Mobile Polish + Visual Proof

Tighten the three-card cluster on mobile, kill the awkward wraps, and add a supporting visual to each card so the section reads as data-backed proof, not just copy.

---

## Pass 1 — Mobile typography & spacing

**File:** `src/components/landing/LandingProblemCluster.tsx`

Tighten the card internals so they fit cleanly on a 375–414px viewport:

- Card padding: `p-8` → `p-6 md:p-8`
- Card gap: `gap-5` → `gap-4 md:gap-5`
- Section side padding stays `px-6`; reduce inner top margin `mt-16` → `mt-10 md:mt-16`
- Problem headline: `text-2xl` → `text-xl md:text-2xl` (prevents "Wrong Drape" from wrapping awkwardly under the icon row)
- Question line: `text-base` → `text-sm md:text-base`
- Solution title: `text-lg` (keep) but tighten `mb-3` → `mb-2`
- Body copy: drop the inline `style={{ fontSize: 14 }}` override; use `text-[13px] md:text-sm` with `leading-[1.55]`
- Icon circle: `w-10 h-10` → `w-9 h-9 md:w-10 md:h-10`
- Reduce vertical rhythm: `mb-6` blocks → `mb-4 md:mb-6`

Headline above grid:
- `clamp(32px, 4vw, 48px)` → `clamp(28px, 5vw, 48px)` so "Three Reasons. Online Shopping Fails." doesn't break mid-word at 375px
- Sub-paragraph: `max-w-lg` → `max-w-md` and `text-base` → `text-[15px] md:text-base`

---

## Pass 2 — Add supporting data visual to each card

Each card gets a small inline data element between the question and the divider. Lightweight SVG/CSS only — no new dependencies.

**Card 01 — Wrong Size**
Mini horizontal bar comparing return rates:
```text
Industry avg returns  ████████████████  30%
DripFit users          ███               6%
```
Rendered as two stacked bars with labels. Source caption: "—80% fewer size returns."

**Card 02 — Wrong Drape**
3-dot confidence meter showing "before scan / after scan":
```text
Before:  ● ○ ○   Guessing
After:   ● ● ●   Verified drape
```
Two rows of filled/empty dots in primary gold + muted, with a small caption.

**Card 03 — Wrong Vibe**
COP / DROP vote bar — a single horizontal split bar showing community verdict ratio (e.g., 73% COP / 27% DROP) with both labels inline. Mirrors the actual community feature.

All three visuals share:
- Height: ~48px block
- Margin: `my-4`
- Use `text-primary` for the active/positive value, `text-muted-foreground/40` for inactive
- Mono font for numbers (`font-mono text-[11px] tracking-wider`)

---

## Pass 3 — Footer stat strip

Replace the single sentence footer with a 3-up mini stat row on desktop, stacked on mobile:

```text
$849.9B          70%              1 in 3
Annual returns   Fit-related      Items returned
```

- Grid: `grid-cols-1 sm:grid-cols-3 gap-4`
- Each stat: gold value (`type-data` or `font-display` 24px), muted label (11px uppercase mono)
- Keeps the existing source citation line below

---

## Out of scope
- Section reorder, copy rewrites, icon swaps
- New chart libraries (Recharts already used elsewhere but overkill here — pure SVG/divs)
- Changes to `LandingRootCause` donut or `LandingMarket` line chart

---

## Risk

| Pass | Risk | Why |
|---|---|---|
| 1 | Low | Responsive class additions only |
| 2 | Low | Self-contained SVG/div blocks per card |
| 3 | Low | Replaces one paragraph with a grid |

**Net result:** Cards fit cleanly on 375px without wraps, each card carries its own proof point, footer becomes scannable data instead of prose.

