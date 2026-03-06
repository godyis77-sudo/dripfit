-- Fix 1: Missing indexes for query performance
CREATE INDEX IF NOT EXISTS idx_tryon_ratings_post_id ON public.tryon_ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_tryon_ratings_rater_user_id ON public.tryon_ratings(rater_user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_tryon_posts_user_id ON public.tryon_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_tryon_posts_public_feed ON public.tryon_posts(created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_size_rec_cache_expires_at ON public.size_recommendations_cache(expires_at);

-- Fix 2: Add updated_at trigger to user_subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fix 3: Scope brand_requests INSERT to authenticated user
DROP POLICY IF EXISTS "Authenticated users can insert brand requests" ON public.brand_requests;
CREATE POLICY "Authenticated users can insert brand requests"
  ON public.brand_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);