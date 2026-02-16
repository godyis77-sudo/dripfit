
-- Drop all restrictive policies on tryon_posts
DROP POLICY "Anyone can view public posts" ON public.tryon_posts;
DROP POLICY "Users can view own posts" ON public.tryon_posts;
DROP POLICY "Users can insert own posts" ON public.tryon_posts;
DROP POLICY "Users can update own posts" ON public.tryon_posts;
DROP POLICY "Users can delete own posts" ON public.tryon_posts;

-- Recreate as PERMISSIVE
CREATE POLICY "Anyone can view public posts"
  ON public.tryon_posts FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own posts"
  ON public.tryon_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON public.tryon_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.tryon_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.tryon_posts FOR DELETE
  USING (auth.uid() = user_id);
