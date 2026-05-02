## Goal

Fill in the 5,188 missing product descriptions with **real merchant copy** scraped from each product URL — no AI invention. Use the existing `backfill-descriptions` edge function, which already implements the right multi-source strategy.

## Strategy (already built into the function)

For each retailer, the function picks the best source in this order:
1. **Shopify `/products.json`** — exact merchant copy for ~30 supported brands (Reformation, Theory, Reiss, AllSaints, Gymshark, etc.). One bulk call per retailer, fastest + most accurate.
2. **Firecrawl `summary` format** — for non-Shopify sites. Returns merchant-grounded summary of the actual product page.
3. **Direct HTML meta-tag scrape** (`<meta name="description">`, `og:description`, JSON-LD) — fast fallback for simple sites.
4. **AI fallback** — only for products where every scrape source fails (typically dead URLs).

This matches "Option C" we discussed — real copy first, AI only as last resort.

## Execution plan

### Step 1: Run a small pilot (50 products)
Invoke the function once with `batch_size: 50`, `use_firecrawl: true`, `skip_ai: false`. Inspect:
- Success rate per retailer
- A few resulting descriptions to confirm they read as real merchant copy
- Firecrawl credit usage

### Step 2: Process in background batches of 200
Loop `~26 batches` (5188 / 200) calling the function with:
```json
{ "batch_size": 200, "use_firecrawl": true, "background": true }
```
Each call returns immediately (202-style) and processes via `EdgeRuntime.waitUntil`. Wait ~3-5 minutes between batches to let work complete and avoid Firecrawl rate limits.

### Step 3: Verify and report
After the run, query `product_catalog` to confirm `description IS NULL` count drops to near zero, and report:
- Total filled
- Breakdown by source (Shopify / Firecrawl / meta / AI fallback)
- Remaining unfilled (likely dead URLs)

### Step 4 (optional): Tag AI-generated rows
If you want provenance later, we can add a `description_source` column in a follow-up migration. Not required now.

## Cost estimate

- **Shopify retailers** (~30 brands): free, ~2-3K products covered
- **Firecrawl**: ~2,000-2,500 scrapes × 1 credit each ≈ 2-3K credits
- **Lovable AI**: only for unscrapeable URLs, likely <300 calls

## Risk / mitigation

- **Dead product URLs** → fall through to AI (or stay null). Acceptable.
- **Firecrawl rate limits / 402** → batches are small + spaced; if credits run out we'll pause and notify you.
- **No schema changes** — existing function, existing column.

## Deliverable after approval

I'll trigger the pilot batch first, share the results with you, then run the full sweep in background batches and report back when done.
