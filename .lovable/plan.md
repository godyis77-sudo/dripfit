

# Update Body Scan Image Everywhere

## What
Replace the current body scan silhouette image with the uploaded high-fidelity Neural Map scan image (`onboarding-body-scan.jpg`) across all locations where body silhouette images are used.

## Locations to Update

The uploaded image is used or should replace the existing silhouette in **6 files** across **4 categories**:

### 1. Onboarding Hero (1 file)
- `src/pages/Onboarding.tsx` — Currently references `/images/onboarding-body-scan.jpg` via public path. Will update to import from `src/assets/`.

### 2. Scan Animations (2 files)
- `src/components/analyze/ScanAnimation.tsx` — imports `body-silhouette-clean.webp`
- `src/components/analyze/PremiumScanAnimation.tsx` — imports `body-silhouette-clean.webp`

### 3. Results & Profile (2 files)
- `src/components/results/BodyDiagram.tsx` — imports `body-silhouette-clean-2.webp`
- `src/components/profile/BodyTab.tsx` — imports `body-silhouette-clean.webp`

### 4. Social Export (1 file)
- `src/components/results/SocialExportCard.tsx` — uses `BodyDiagram` (inherits update automatically)

### NOT changing (intentionally different assets)
- `CaptureViewfinder.tsx` / `Capture.tsx` — these use **mask images** (`body-silhouette-mask.png`, `body-silhouette-side-mask.png`) for the alignment overlay. These are functional masks, not display images.
- `MediaKit.tsx` — uses hero previews and feature screenshots, not the scan silhouette.

## Steps

1. **Copy uploaded image** to `src/assets/onboarding-body-scan.jpg` (replacing the existing one)
2. **Update imports** in all 5 files above to point to the new image
3. **Adjust `mix-blend-mode`** in ScanAnimation and PremiumScanAnimation — the new image has a dark background with a gold-lit silhouette, so `screen` blend mode should work well, but may need the brightness/contrast filters tuned down since the image is already properly lit
4. **Update BodyDiagram** — the new image includes measurement labels baked in; the component already renders its own measurement overlays, so we'll use the silhouette figure only (the dark body shape). If the full image looks good as-is behind the overlays, we keep it; otherwise we may need to crop or adjust opacity

## Considerations
- The uploaded image is a JPG — we'll use it as-is since it's already high quality and the WebP conversion of the old silhouettes was for a simpler graphic
- The new image has a rich dark background with gold HUD elements, which aligns with the luxury techwear brand identity
- Components that apply their own HUD overlays (BodyDiagram) may need opacity/filter adjustments to avoid visual conflict with the baked-in labels in the new image

