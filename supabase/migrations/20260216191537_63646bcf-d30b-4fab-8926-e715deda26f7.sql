
-- Fix tryon_ratings policies (also restrictive)
DROP POLICY "Anyone authenticated can view ratings" ON public.tryon_ratings;
DROP POLICY "Users can insert own ratings" ON public.tryon_ratings;
DROP POLICY "Users can update own ratings" ON public.tryon_ratings;
DROP POLICY "Users can delete own ratings" ON public.tryon_ratings;

CREATE POLICY "Anyone authenticated can view ratings"
  ON public.tryon_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own ratings"
  ON public.tryon_ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_user_id);

CREATE POLICY "Users can update own ratings"
  ON public.tryon_ratings FOR UPDATE
  USING (auth.uid() = rater_user_id);

CREATE POLICY "Users can delete own ratings"
  ON public.tryon_ratings FOR DELETE
  USING (auth.uid() = rater_user_id);

-- Fix profiles policies
DROP POLICY "Anyone can view profiles" ON public.profiles;
DROP POLICY "Users can insert own profile" ON public.profiles;
DROP POLICY "Users can update own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);
