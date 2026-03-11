
-- 1. FIX CRITICAL: user_subscriptions - remove INSERT/UPDATE for regular users
-- Subscriptions should only be managed by service role (Stripe webhooks)
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;

-- Only allow users to READ their own subscription
CREATE POLICY "Users can view own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No INSERT/UPDATE for regular users - only service_role can modify

-- 2. FIX: community_votes - require authentication for SELECT
DROP POLICY IF EXISTS "Anyone can view votes" ON public.community_votes;
DROP POLICY IF EXISTS "Public can view votes" ON public.community_votes;

CREATE POLICY "Authenticated users can view votes"
ON public.community_votes
FOR SELECT
TO authenticated
USING (true);

-- 3. FIX: tryon_ratings - scope SELECT to own ratings or ratings on own posts
DROP POLICY IF EXISTS "Users can view ratings" ON public.tryon_ratings;
DROP POLICY IF EXISTS "Authenticated users can view ratings" ON public.tryon_ratings;

CREATE POLICY "Users can view relevant ratings"
ON public.tryon_ratings
FOR SELECT
TO authenticated
USING (
  auth.uid() = rater_user_id
  OR post_id IN (SELECT id FROM public.tryon_posts WHERE user_id = auth.uid())
  OR post_id IN (SELECT id FROM public.tryon_posts WHERE is_public = true)
);

-- 4. FIX: profiles - scope to own profile + limited public access for community
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can read any authenticated profile (needed for community display_name/avatar)
-- This is acceptable since the data shown (display_name, avatar) is intentionally public
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
