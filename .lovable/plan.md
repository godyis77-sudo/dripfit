

# Multi-Image Product Scraping Enhancement

## What We're Building

Currently, the scraper collects multiple images per product internally (`image_urls` array) but only stores the single "best" image in the database (`image_url` column). This plan adds an `additional_images` column to store up to 5 extra photos per product, and prioritizes products with multiple images during scraping.

## Technical Details

### 1. Database Migration — Add `additional_images` column

Add a `text[]` column to `product_catalog`:
```sql
ALTER TABLE public.product_catalog 
  ADD COLUMN IF NOT EXISTS additional_images text[] DEFAULT '{}';
```

Update the `get_filtered_catalog` RPC to return this new column (it already uses `SELECT *`, so no function change needed).

### 2. Scraper Update — Store additional images on insert

**File:** `supabase/functions/scrape-products/index.ts`

- In the `selectBestImage` function (~line 2947): return the remaining image URLs alongside the best one. Add an `additional_image_urls` field to `ClassifiedProduct`.
- In the DB insert block (~line 3491): include `additional_images` in the row, populated from the classified product's extra URLs (up to 5, filtered for junk).
- Apply the same junk-URL filtering and validation to additional images.

### 3. Scraper Update — Prioritize multi-image products

- In the Shopify parser (~line 1155): already captures up to 8 images — no change needed.
- In search/Firecrawl parsers (~lines 1780-2010): most only capture 1 image. Enhance the Firecrawl HTML parser to extract multiple `<img>` tags per product card when available.
- In the deduplication/sorting stage: add a confidence boost (+2 score) for products with 3+ images, so multi-image products rank higher and are preferred during dedup.

### 4. Frontend — Surface additional images

**File:** `src/components/ui/ProductPreviewModal.tsx`

- Add a simple image carousel/dots when `additional_images` exists and has entries.
- Users can swipe through product photos in the preview modal.

**File:** `src/hooks/useProductCatalog.ts`

- Add `additional_images?: string[]` to the `CatalogProduct` interface.

### Files Changed
- **Migration SQL** — new `additional_images` column
- `supabase/functions/scrape-products/index.ts` — store extra images, boost multi-image products
- `src/hooks/useProductCatalog.ts` — add type
- `src/components/ui/ProductPreviewModal.tsx` — image carousel

