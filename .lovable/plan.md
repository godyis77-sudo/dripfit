

The user wants to add a swipe card feed to the authenticated home page (post-scan), populated with:
1. This week's curated looks (`weekly_outfits` table)
2. Top liked community posts of the week (`tryon_posts` filtered by recent engagement)

Let me check what's already in place quickly.

Key context I already have:
- `useWeeklyOutfits` hook exists and returns `WeeklyOutfit[]` with `hero_image_url`
- `useCommunityFeed` exists with trending sort via `get_trending_posts` RPC (already filters last 168h = 7 days, sorts by votes+ratings+comments)
- `AuthenticatedHome.tsx` is the post-scan home
- `tryon_posts` already has `is_public`, `moderation_status`, `result_photo_url`, `clothing_category`, `product_urls`
- `community_votes` powers COP/DROP via `VotePanel`
- `framer-motion` is used throughout for animations

What's missing:
- A swipe card component
- An "add top liked posts of the week to the feed" function — this could mean either (a) automatically promote top posts for visibility, or (b) just surface top weekly posts in this swipe feed. Need to clarify but I'll assume the simpler read-only approach: query top-of-week posts directly via existing `get_trending_posts` (it already does 168h window).

I should keep this concise and not over-engineer.

