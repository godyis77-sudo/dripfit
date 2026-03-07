

# Body Diagram as Generated Image

## Overview
Replace the current SVG-based body diagram with an AI-generated realistic body silhouette image, with measurement labels overlaid using HTML/CSS positioning instead of SVG text elements.

## Approach

1. **Create an edge function** (`generate-body-diagram`) that calls the Lovable AI image generation model (`google/gemini-2.5-flash-image`) to produce a clean, minimal body silhouette image -- a neutral, front-facing human figure on a transparent/dark background, suitable for overlaying measurement annotations.

2. **Update `BodyDiagram.tsx`** to:
   - Call the edge function on mount (with caching in state/localStorage so it doesn't regenerate every time)
   - Display the generated image as an `<img>` tag
   - Overlay measurement labels using absolutely-positioned HTML `<div>` elements with CSS lines/connectors
   - Show a loading skeleton while the image generates
   - Fall back gracefully if generation fails

3. **Measurement overlay** will use CSS `position: absolute` divs placed at percentage-based coordinates over the image, with thin CSS border lines as connectors -- replicating the same label layout (shoulder, bust, chest, sleeve, waist, hips, inseam, height) but in HTML instead of SVG.

## Technical Details

### New Edge Function: `supabase/functions/generate-body-diagram/index.ts`
- Accepts a POST with optional gender parameter
- Calls `google/gemini-2.5-flash-image` with a prompt for a clean anatomical silhouette figure
- Returns the base64 image data
- Uses `LOVABLE_API_KEY` (already available)

### Updated Component: `src/components/results/BodyDiagram.tsx`
- Fetches image once, caches the base64 result in `localStorage` (key: `dripcheck_body_silhouette`)
- Renders image inside a `relative` container
- Positions measurement annotations as `absolute` HTML elements at percentage-based top/left coordinates
- Displays cm and inch values using the same formatting logic
- Shows skeleton loader during generation

### No database changes required.

