

## Make All Buttons & Crown Icons Use the Gold (btn-luxury) Color

The user wants consistency: all interactive buttons and Crown icons throughout the app should use the same warm gold color as the "Start Scan" button (`btn-luxury` gradient: `hsl(42 45% 62%)` → `hsl(42 35% 72%)`).

### What's Changing

**1. CSS Variable Update (`src/index.css`)**
- Change `--primary` from `45 88% 40%` (dark saturated gold) to `42 45% 62%` (the warm gold used in `btn-luxury`)
- This automatically updates every `text-primary`, `bg-primary`, `border-primary`, and Crown icon color across the entire app since they all reference `hsl(var(--primary))`
- Update related variables (`--accent`, `--drip-glow`, `--drip-accent`, `--drip-gold`, `--ring`, sidebar vars) to harmonize with the new primary

**2. Button Default Variant (`src/components/ui/button.tsx`)**
- Update the `default` variant to use `btn-luxury` styling so all `<Button>` components without explicit variant get the gold gradient + shadow treatment, matching the CTA buttons

**3. Gradient Utilities (`src/index.css`)**
- Adjust `gradient-drip`, `gradient-drip-text`, `glow-primary`, `btn-luxury`, and `btn-3d-drip` to stay harmonized — these may need only minor tweaks since they already use `hsl(42 ...)` values close to the new primary

### Scope
- ~24 files use `btn-luxury` explicitly — those stay as-is
- ~50+ files reference `text-primary` for icons (including Crown) — all update automatically via the CSS variable
- Crown icons in PremiumBadge, UpgradePrompt, Profile, Welcome, Onboarding, Premium pages — all use `text-primary` or `text-primary-foreground`, so they update automatically
- No component-level code changes needed for Crown icons

### Risk
- Changing `--primary` affects the entire color system. Elements using `bg-primary` (dots, badges, borders) will shift too. This is intentional for brand consistency but worth verifying across all pages.

