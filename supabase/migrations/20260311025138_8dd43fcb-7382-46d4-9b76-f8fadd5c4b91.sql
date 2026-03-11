
-- Fix: Remove old user_subscriptions INSERT/UPDATE policies that still exist
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;

-- Fix: Remove old community_votes public SELECT policy
DROP POLICY IF EXISTS "Anyone can view votes" ON public.community_votes;

-- Fix: Remove old tryon_ratings broad SELECT policy  
DROP POLICY IF EXISTS "Authenticated users can view ratings" ON public.tryon_ratings;
