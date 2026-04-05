

# Smart Catalog Limit Strategy

## The Problem
The "Browse All" view fetches only 500 products from ~8,900 total, so brands like Essentials (121 products) only show ~29 items proportionally.

## Performance Analysis
- **4,000 products** in a single RPC call is technically possible but wasteful — it transfers ~2-4MB of JSON over the wire, most of which the user never scrolls to see (the grid only shows 30 at a time via pagination).
- The real issue: when **no filters are active** ("All" category, no brand), you get a random slice. When filters ARE active (specific brand or category), 500 is usually plenty.

## Recommended Approach: Dynamic Limit

Instead of a blanket increase, use a **smart dynamic limit** based on filter state:

1. **When filters are applied** (brand, category, retailer, genre) → keep `p_limit` at 500 (filtered results are small)
2. **When "All" with no filters** → increase to **2,000** (good balance of variety vs. payload size)
3. **When a specific brand is selected** → set limit to **1,000** to ensure full brand coverage

This avoids downloading 4,000+ products when the user is just browsing casually, while ensuring filtered views show complete results.

## Technical Details

### File: `src/hooks/useProductCatalog.ts`
- In `fetchCatalogProducts()`, compute `p_limit` dynamically:
  - If `brand` is set → 1000
  - If `category` is set and not "all" → 500
  - Otherwise ("All" browsing) → 2000
- No database changes needed — the RPC already accepts `p_limit` as a parameter

### Single Change Location
Only the `params` object construction (~line 125) needs updating — replace the hardcoded `p_limit: 500` with the dynamic value.

### Why Not 4,000+
- Each product row is ~500 bytes → 4,000 = ~2MB payload
- The frontend only renders 30 items at a time (paginated)
- Supabase has a default 1,000-row limit per query (the RPC bypasses this with explicit LIMIT, but large payloads still impact mobile performance)
- 2,000 for "All" gives 4x more variety while staying under ~1MB

