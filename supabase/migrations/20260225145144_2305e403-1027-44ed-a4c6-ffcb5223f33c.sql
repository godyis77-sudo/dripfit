
-- Fix permissive INSERT on body_scans: require auth OR valid session_id
DROP POLICY IF EXISTS "Anyone can insert scans" ON public.body_scans;
CREATE POLICY "Authenticated or session users can insert scans"
  ON public.body_scans FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- Fix permissive INSERT on user_preferences: require auth OR valid session_id
DROP POLICY IF EXISTS "Anyone can insert preferences" ON public.user_preferences;
CREATE POLICY "Authenticated or session users can insert preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );
