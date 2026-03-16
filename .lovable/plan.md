# UI/UX Fix Plan — DripFitCheck

## Phase 1: High-Priority Fixes
1. **Sticky Try-On CTA** — Make the "Generate" button on `/tryon` sticky at bottom so it's never pushed below fold
2. **Community filter simplification** — Collapse advanced sort pills behind a single toggle; reduce cognitive load on Style Check page
3. **Auth loading state** — Add skeleton/spinner during `authLoading` on protected routes instead of blank screen

## Phase 2: Accessibility & Touch Targets
4. **44px touch targets** — Enforce min-h-[44px] on all filter pills, sort buttons, and small interactive elements across Community, Shop, and Profile
5. **Light mode contrast** — Darken `--muted-foreground` to meet WCAG AA 4.5:1 contrast ratio
6. **Aria labels audit** — Ensure all icon-only buttons have descriptive aria-labels

## Phase 3: Layout & Consistency
7. **Reusable PageHeader component** — Standardize back button + title + actions pattern across Welcome, Community, Profile, TryOn pages
8. **Profile tab truncation** — Switch to icon+label tabs that gracefully handle narrow screens (≤360px)
9. **Authenticated Home density** — Reduce sections above fold, prioritize primary CTA

## Phase 4: Polish & Feedback
10. **Pull-to-refresh** — Add pull-to-refresh on Community feed and product grids
11. **Empty state improvements** — Better illustrations and CTAs for zero-data states
12. **Skeleton consistency** — Use unified Skeleton components instead of inline `skeleton-gold` classes
