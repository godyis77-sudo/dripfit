

# Fix Multi-Image Dots Visibility and Add Tap Navigation

## Problem
1. Dot indicators on product images are white on white backgrounds — invisible
2. Swiping between images doesn't work reliably (swipe gesture conflicts with zoom touch handling)
3. No tap-to-navigate option for cycling through photos

## Changes

### File: `src/components/ui/ProductPreviewModal.tsx`

**1. Dot indicators — add dark outline for visibility on any background**
- Replace plain white dots with dots that have a dark border/shadow ring so they're visible on both light and dark product images
- Active dot: solid white with dark shadow ring
- Inactive dot: semi-transparent with dark outline
- Move dots to bottom of image (above caption) for better visibility

**2. Add left/right tap zones for navigation**
- Split the image into left-third and right-third invisible tap zones
- Tapping right side → next image; tapping left side → previous image
- Only active when zoom is 1x and multiple images exist
- Add subtle chevron arrows that appear briefly on tap

**3. Improve swipe reliability**
- Lower the swipe threshold from 50px to 30px and increase time window from 400ms to 600ms for easier swiping

### Dot styling (before → after)
```
Before: bg-white / bg-white/40
After:  bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.4)] / bg-white/50 shadow-[0_0_0_1.5px_rgba(0,0,0,0.3)]
```

### Tap zone logic (new)
```
onClick → if zoom === 1 && hasMultiple:
  - click in left 33% → prev image
  - click in right 33% → next image
  - click in center → no action (allows double-tap zoom)
```

