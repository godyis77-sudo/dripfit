# UI/UX Fix Plan — DripFitCheck

## Phase 1: High-Priority Fixes ✅
1. ~~**Sticky Try-On CTA**~~ ✅ — Generate button sticky at bottom with gradient fade
2. ~~**Community filter simplification**~~ ✅ — Sort options collapsed behind SlidersHorizontal toggle
3. ~~**Auth loading state**~~ ✅ — Skeleton layout in ProtectedRoute during loading

## Phase 2: Accessibility & Touch Targets ✅
4. ~~**44px touch targets**~~ ✅ — All pills (.pill class), filter buttons, community tabs, and icon buttons enforced to min-h-[44px]
5. ~~**Light mode contrast**~~ ✅ — Already WCAG AA compliant (Light: ~7.5:1, Dark: ~5.8:1)
6. ~~**Aria labels audit**~~ ✅ — All icon-only buttons have aria-labels or sr-only text

## Phase 3: Layout & Consistency
7. **Reusable PageHeader component** — Standardize back button + title + actions pattern across Welcome, Community, Profile, TryOn pages
8. **Profile tab truncation** — Switch to icon+label tabs that gracefully handle narrow screens (≤360px)
9. **Authenticated Home density** — Reduce sections above fold, prioritize primary CTA

## Phase 4: Polish & Feedback
10. **Pull-to-refresh** — Add pull-to-refresh on Community feed and product grids
11. **Empty state improvements** — Better illustrations and CTAs for zero-data states
12. **Skeleton consistency** — Use unified Skeleton components instead of inline `skeleton-gold` classes
