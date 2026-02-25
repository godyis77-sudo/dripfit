
-- Fix 1: Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 2: Restrict public tryon_posts SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view public posts" ON public.tryon_posts;
CREATE POLICY "Authenticated users can view public posts"
  ON public.tryon_posts FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_public = true);

-- Fix 3: Fix tryon_ratings SELECT to actually require authentication
DROP POLICY IF EXISTS "Anyone authenticated can view ratings" ON public.tryon_ratings;
CREATE POLICY "Authenticated users can view ratings"
  ON public.tryon_ratings FOR SELECT
  USING (auth.uid() IS NOT NULL);
