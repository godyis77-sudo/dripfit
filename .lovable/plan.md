
# Creator Outreach CRM — Playbook Enablement

Your strategy note breaks into two buckets:

**Out of scope for code** (you handle these manually):
- Creating the @dripfitcheck Instagram account + 9 grid posts
- Sourcing creator emails from bios/Linktrees
- Writing the actual pitch copy per creator (personalization beats automation)

**In scope — what we'll build into the existing `/admin/creator-outreach` CRM:**

## 1. Send the pitch email directly from the lead drawer

Today the CRM tracks status but you still have to leave the app to send the email from your inbox. We'll add a "Send Pitch" action that:
- Opens a composer with subject pre-filled: `[Name] x DripFit — cash commissions, not credits`
- Body pre-filled from a 3-beat template (personalization placeholder, one-line product pitch, offer, CTA) — fully editable before send
- Sends via the existing `send-transactional-email` infrastructure (new `creator-pitch` and `creator-pitch-followup` templates)
- Auto-logs the send to `creator_outreach_notes` with type `email_sent`
- Auto-advances status `new → contacted` on first send, `contacted → followed_up` on second send
- Stamps `last_contacted_at`

This means: open lead → personalize 1-2 sentences → send → status moves automatically.

## 2. Follow-up cadence (Day 4 / Day 10 rule)

Add a "Cadence" view to the CRM that surfaces leads needing action today based on your sequence:
- **Due for follow-up**: status=`contacted`, `last_contacted_at` ≥ 4 days ago, no follow-up sent yet
- **Stale — move on**: status=`followed_up`, `last_contacted_at` ≥ 10 days ago, no reply → one-click mark as `ghosted`
- **Awaiting reply**: status=`contacted` or `followed_up`, within window — informational

This is a single new tab/filter in the existing UI. No automation, no auto-send — just surfaces who needs attention so nothing slips.

## 3. Segment + tier fields for batch planning

You said "pitch 7-10 nano/micro in week 1, mid-tier in week 3." The CRM has `follower_count` but no tier bucket or segment tag. Add:
- `tier` enum: `nano` (<10K), `micro` (10-50K), `mid` (50-250K), `macro` (250K+) — auto-derived from `follower_count` on save
- `segment` free-text tag (e.g. "fit check TikTok", "size inclusivity", "menswear minimalist")
- `content_angle` free-text on the activity log entry when they go active — so you can see which angle converts

Filter chips for tier and segment in the list view. Export already includes all fields.

## What we are NOT building
- Auto-sending follow-ups (intentional — your strategy note says personalization matters; automation kills that)
- Email scraping from social bios (against most ToS, and unreliable)
- IG account / content creation (manual)
- Reply detection / inbox sync (would need IMAP connector — overkill for this volume)

## Technical details

**Migration:**
- Add `tier text` and `segment text` columns to `creator_leads` (nullable)
- Trigger to auto-set `tier` from `follower_count` on insert/update
- No changes to `creator_outreach_notes`

**New files:**
- `supabase/functions/_shared/transactional-email-templates/creator-pitch.tsx` — initial pitch with `{name}`, `{personalNote}`, `{referralLink}` props
- `supabase/functions/_shared/transactional-email-templates/creator-pitch-followup.tsx` — Day 4 bump
- Register both in `registry.ts`

**UI changes (`AdminCreatorOutreach.tsx`):**
- Lead drawer: new "Send Pitch" / "Send Follow-up" buttons that open a composer modal (Dialog with Textarea for personal note, preview of full email)
- New top-level filter tab "Cadence" alongside existing status filters
- Filter chips for `tier` (Nano/Micro/Mid/Macro)
- Status auto-advance + activity log on successful send

**Email infra:** Already set up (`send-transactional-email` exists). Just need to register two new templates and redeploy.

After approval, I'll implement all three pieces in one pass.
