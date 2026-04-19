
The user is providing a detailed spec for a fix I already proposed (URL normalization in PDP enrichment matching). Their approach is more thorough than mine — adds locale-prefix stripping, query-param whitelist, and explicit `via` tracking for telemetry. I should adopt it as-is.

Let me locate the exact code section to confirm the current shape before planning the edit.

Plan is straightforward: 1 file, 3 surgical edits per the spec. No questions needed — spec is unambiguous.

## Plan

**File:** `supabase/functions/scrape-products/index.ts`

**Step 1 — Add helpers** (near top, after type defs):
- `PRODUCT_ID_PARAMS` Set (whitelist: pid, id, sku, variant, color, etc.)
- `normalizeUrlForMatch(url)` — strips protocol/www/trailing-slash/locale-prefix/tracking params, sorts whitelisted query params, lowercase
- `extractProductSlug(url)` — last path segment, strips .html/.aspx/.php

**Step 2 — Replace batch matching logic** in the `[pdp-enrich]` block:
- Build two indexes from Firecrawl results: `byNormUrl` and `bySlug`
- Two-tier lookup: normalized URL first, slug fallback (slug must be >3 chars)
- Track match path via `via: 'norm' | 'slug'`
- Emit new log: `[pdp-enrich] match breakdown: norm=X, slug=Y, unmatched=Z`
- When 0 matched, log first-sent vs first-returned URL pair for diagnosis

**Step 3 — Update downstream consumer loop**:
- Change from `for (const p of heroCandidates) { ...byUrl.get... }` to `for (const m of matched) { const p = ...; const hit = m.result }`
- Preserve description extraction, image merging, DB writes — only the lookup mechanism changes

**Step 4 — Deploy** the `scrape-products` function.

**Step 5 — Trigger one test scrape** (Stone Island/outerwear or Essentials/tops) and read logs to report back the `match breakdown: norm=X, slug=Y, unmatched=Z` line.

**Out of scope (per spec):** enrichment merge logic, description extraction, image merging, DB writes, orchestrator rate-limit fix (separate concern from earlier diff).
