# UI/UX Fix Plan — DripFitCheck

## Phase 1: High-Priority Fixes ✅
1. ~~**Sticky Try-On CTA**~~ ✅ — Generate button sticky at bottom with gradient fade
2. ~~**Community filter simplification**~~ ✅ — Sort options collapsed behind SlidersHorizontal toggle
3. ~~**Auth loading state**~~ ✅ — Skeleton layout in ProtectedRoute during loading

## Phase 2: Accessibility & Touch Targets ✅
4. ~~**44px touch targets**~~ ✅ — All pills, filter buttons, community tabs, icon buttons enforced to min-h-[44px]
5. ~~**Light mode contrast**~~ ✅ — Already WCAG AA compliant (Light: ~7.5:1, Dark: ~5.8:1)
6. ~~**Aria labels audit**~~ ✅ — All icon-only buttons have aria-labels or sr-only text

## Phase 3: Layout & Consistency ✅
7. ~~**Reusable PageHeader component**~~ ✅ — `src/components/layout/PageHeader.tsx` with back, title, subtitle, actions slots. Applied to TryOn.
8. ~~**Profile tab truncation**~~ ✅ — Icons always visible, labels hidden below 360px via `hidden min-[360px]:inline`. Tabs enforced to min-h-[44px].
9. ~~**Authenticated Home density**~~ ✅ — Gender nudge and scan upsell compacted to single-line banners. Quick actions grid spacing tightened.

## Phase 4: Polish & Feedback ✅
10. ~~**Pull-to-refresh**~~ ✅ — PullToRefresh wrapper added to Community feed (both feed tabs and shop tab)
11. ~~**Empty state improvements**~~ ✅ — Unified EmptyIcon component, added GenericEmptyState export, cleaner copy and sizing
12. ~~**Skeleton consistency**~~ ✅ — CategoryProductGrid skeletons now match ProductCardSkeletons structure (border, info rows, spacing)
