

## Review Summary & Action Plan

### What's Already Solved

The reviewer raised three landing page concerns. Two are already addressed in the current V2 build:

1. **Email capture above the fold** — Already done. `LandingEmailCapture` is in the hero section (line 42 of `LandingHero.tsx`).
2. **Competing CTAs removed** — The "Watch It Work" outline button was eliminated in the V2 rebuild. Only "Map Your Body" remains.
3. **Hero CTA destination** — Currently submits to `waitlist_signups`. Once the app is live on stores, this should link to the app store listing. No change needed yet.

### What Needs Fixing: Scraper Queue Architecture

The reviewer correctly identified a real risk. The `scrape-all-products` function uses `setTimeout` (line 290) to fire post-processing tasks after individual scrapes complete. In Deno Deploy, the worker can be killed after the response is sent, meaning `setTimeout` callbacks may never execute.

Your project already uses `pg_cron` + `pg_net` for scheduled tasks (per your automation memory). The fix is to move the post-processing chain into that same pattern instead of relying on in-function timeouts.

### Plan

**Task 1: Replace setTimeout post-processing with pg_cron jobs**

In `scrape-all-products/index.ts`:
- Remove the `setTimeout` block (lines 289-316) that fires categorize, gender backfill, audit, and cleanup
- Instead, after dispatching scrape jobs, insert a row into a new `scrape_runs` table with `status = 'scraping'` and a `post_process_at` timestamp (e.g., now + estimated delay)
- Create a `scrape_runs` table via migration: `id`, `batch_number`, `status` (scraping/post_processing/done), `post_process_at`, `created_at`
- Add a pg_cron job (every 2 minutes) that checks for rows where `status = 'scraping' AND post_process_at <= now()`, then fires the 4 post-processing functions via `pg_net.http_post`, and updates status to `post_processing`

This guarantees execution regardless of edge function lifecycle.

**Task 2: Landing page — minor CTA refinement**

The "Map Your Body" button currently submits to the waitlist. Once app store links are live, we swap the hero CTA to link directly to the store listing. For now, no change needed — the waitlist flow is correct for pre-launch.

### Technical Details

- **Migration**: New `scrape_runs` table with RLS disabled (internal use only, accessed via service role)
- **pg_cron job**: Uses existing `pg_net` extension to POST to the 4 cleanup functions
- **Edge function edit**: ~30 lines removed (setTimeout block), ~10 lines added (insert into scrape_runs)
- **No UI changes required**

