

## Plan: Add Smooth Scroll Animations to Product Grids

### What This Does
Adds a staggered fade-in + slide-up animation to product cards as they scroll into view, giving all product grids a polished, app-like feel. Cards will appear smoothly as you scroll rather than popping in all at once.

### Approach
Use the Intersection Observer API via a lightweight custom hook (`useScrollReveal`) to detect when cards enter the viewport, then apply a CSS transition for fade + translate. This avoids heavy JS animation libraries and keeps scrolling at 60fps.

### Files to Create/Edit

1. **Create `src/hooks/useScrollReveal.ts`**
   - Custom hook using `IntersectionObserver` with a small `rootMargin` threshold
   - Returns a `ref` callback that registers each card element
   - Marks elements as "revealed" with a data attribute or class when they enter the viewport
   - Supports stagger delay based on index

2. **Create `src/components/ui/ScrollRevealGrid.tsx`**
   - A wrapper component that replaces raw `div className="grid grid-cols-2 gap-..."` grids
   - Accepts `children` and applies the reveal hook to each child via `React.Children.map` + `cloneElement`
   - Alternatively, a simpler `ScrollRevealCard` wrapper for individual items
   - CSS: starts `opacity-0 translate-y-4`, transitions to `opacity-100 translate-y-0` with a staggered delay per card

3. **Edit `src/components/catalog/CategoryProductGrid.tsx`**
   - Wrap each product card with the reveal animation (either via the wrapper or by applying the hook's ref)

4. **Edit `src/components/community/CommunityFeedGrid.tsx`**
   - Apply the same scroll-reveal to community post cards

5. **Edit `src/pages/OutfitsWeekly.tsx`**
   - Apply scroll-reveal to the weekly outfit grid cards

6. **Edit `src/components/profile/TryOnsTab.tsx`**
   - Apply scroll-reveal to the try-on history grid

7. **Edit `src/index.css`** (if needed)
   - Add the transition utility classes for the reveal animation

### Technical Details
- Intersection Observer with `threshold: 0.1` and `rootMargin: '0px 0px 50px 0px'` to trigger slightly before cards are fully visible
- Each card gets a stagger delay of `index * 50ms` (capped at ~300ms) for a cascade effect
- Uses CSS `transition` (not JS animation) for GPU-accelerated smoothness
- `once: true` — cards stay visible after reveal, observer disconnects
- No impact on existing scroll behavior or autoScroll utility

