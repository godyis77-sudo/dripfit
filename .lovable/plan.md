

## Plan: Apply Home Screen Recommended Grid Badge Style to Wardrobe & Cart

### What the home screen "Recommended for you" cards look like
Each product card in `CategoryProductGrid` has:
- **3:4 aspect ratio** image area
- **Bottom-right of image**: Brand pill (`bg-background/80 backdrop-blur-sm`, `text-[8px] font-bold uppercase`)
- **Below image**: Brand name (muted, uppercase, `text-[9px]`), product name (bold, `text-[11px]`, 2-line clamp), and price (primary color, `text-[12px] font-bold`)

### Changes

#### 1. Wardrobe Tab Grid (`src/components/profile/WardrobeTab.tsx`)
Restructure each wardrobe card to match the recommended grid card layout:
- Wrap image in `aspect-[3/4]` container
- Move the retailer badge from `bg-primary` to the home screen style: `bg-background/80 backdrop-blur-sm rounded-md` with `text-[8px] font-bold uppercase` brand text
- Below image: add the same info section with brand (muted uppercase `text-[9px]`), item name/notes (bold `text-[11px]` with 2-line clamp), and date (where price would be, `text-[12px]`)

#### 2. Wardrobe Detail Sheet (`src/components/profile/WardrobeDetailSheet.tsx`)
Add matching overlay badges on the detail image:
- **Bottom-right**: Brand pill in `bg-background/80 backdrop-blur-sm` style (replacing the current `bg-primary` retailer badge)
- Keep info chips below but style the brand/category to match the recommended card typography

#### 3. Cart Tab Detail Card (`src/components/profile/CartTab.tsx`)
Add overlay badge on the cart item thumbnail image:
- **Bottom-right of thumbnail**: Brand pill (`bg-background/80 backdrop-blur-sm`) showing detected brand from URL
- Move the existing brand chip from the text area to the image overlay
- Style the text info area below to match: brand (muted uppercase), caption (bold), date

### Files to edit
1. `src/components/profile/WardrobeTab.tsx` — restructure grid cards to match recommended product card layout
2. `src/components/profile/WardrobeDetailSheet.tsx` — update detail image badge styling
3. `src/components/profile/CartTab.tsx` — add brand badge overlay on thumbnail, restyle info area

