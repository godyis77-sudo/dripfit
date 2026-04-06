

# Add Product Descriptions to Catalog and Detail Page

## What Changes

Capture product descriptions during scraping and display them on the product detail modal.

## Steps

### 1. Database Migration — Add `description` column
Add a `text` column `description` to `product_catalog` (nullable, no default needed).

```sql
ALTER TABLE public.product_catalog ADD COLUMN description text;
```

### 2. Scraper — Capture descriptions

**File: `supabase/functions/scrape-products/index.ts`**

- Add `description: string | null` to the `RawProduct` interface
- Add `description: string | null` to `ClassifiedProduct` (inherited from RawProduct)
- In `parseShopifyProduct()`: extract `item.body_html`, strip HTML tags, truncate to 500 chars, and set as `description`
- In the Firecrawl/search scrape paths: use the existing `extractDescription()` function output as `description`
- In the DB insert block (~line 3499): include `description` in the row object

**Shopify description extraction (in `parseShopifyProduct`):**
```typescript
// Strip HTML tags from body_html to get plain text description
let description: string | null = null;
if (item.body_html && typeof item.body_html === 'string') {
  const plain = item.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length > 15) description = plain.slice(0, 500);
}
```

### 3. Frontend Types — Add description field

**File: `src/hooks/useProductCatalog.ts`**
- Add `description?: string | null` to `CatalogProduct` interface

**File: `src/components/ui/ProductPreviewModal.tsx`**
- Add `description?: string | null` to `ProductPreviewData` interface

### 4. Product Detail Modal — Show description

**File: `src/components/ui/ProductPreviewModal.tsx`**

Below the product name/price section and above the action buttons, add a collapsible description section:

```
{product.description && (
  <p className="text-[12px] text-white/70 leading-relaxed text-center 
     line-clamp-3 px-2">
    {product.description}
  </p>
)}
```

This shows up to 3 lines of description text in the modal, keeping the layout clean.

### Files Changed
- **Migration SQL** — new `description` column on `product_catalog`
- `supabase/functions/scrape-products/index.ts` — capture description from Shopify `body_html` and Firecrawl markdown
- `src/hooks/useProductCatalog.ts` — add `description` to type
- `src/components/ui/ProductPreviewModal.tsx` — add `description` to type + render it

