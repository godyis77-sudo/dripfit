

## Profile Body — Size Guide Tool Refresh

Make the Size Guide Tool entry on `/profile/body` more prominent, and remove its icon tile (the "emoji").

### Changes — `src/pages/ProfileBody.tsx` (lines 166–178)

**Remove**
- The 48×48 rounded icon tile containing the `Ruler` icon on the left of the card.

**Upgrade button visibility**
- Promote the card from quiet glass-dark to a clear gold-accent CTA so it reads as an action, not a passive row.
- New treatment:
  - Background: `bg-primary/[0.06]` with `border border-primary/30` (gold-tinted glass)
  - Add a small uppercase eyebrow label: `TOOL` in gold mono (`text-[10px] tracking-[0.18em] text-primary/70`)
  - Title: `Size Guide` — `text-[15px] font-semibold text-white`
  - Subtitle: `Check your size for any brand instantly` — `text-[11px] text-white/50`
  - Right side: gold `ArrowRight` chevron (`h-4 w-4 text-primary`) to signal tap affordance
  - Slightly taller padding (`py-4`) and `active:scale-[0.98]` retained

### Result
```text
┌────────────────────────────────────────────┐
│ TOOL                                       │
│ Size Guide                              →  │
│ Check your size for any brand instantly    │
└────────────────────────────────────────────┘
```
Gold border + eyebrow + chevron make it read as the primary discovery tool above the fit toggle, while removing the redundant icon tile.

### Imports
- Remove unused `Ruler` icon import (still used in empty state — keep import).
- Add `ArrowRight` to lucide-react import.

No other files affected. No data, routing, or analytics changes.

