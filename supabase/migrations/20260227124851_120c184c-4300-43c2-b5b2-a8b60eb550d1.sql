
-- Drop old session-based policies on body_scans
DROP POLICY IF EXISTS "Authenticated or session users can insert scans" ON public.body_scans;
DROP POLICY IF EXISTS "Users can delete own scans" ON public.body_scans;
DROP POLICY IF EXISTS "Users can read own scans" ON public.body_scans;

-- New auth-only policies for body_scans
CREATE POLICY "Users can insert own scans"
ON public.body_scans FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can read own scans"
ON public.body_scans FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete own scans"
ON public.body_scans FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Drop old session-based policies on saved_items
DROP POLICY IF EXISTS "Users can insert saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Users can read own saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Users can delete own saved items" ON public.saved_items;

-- New auth-only policies for saved_items
CREATE POLICY "Users can insert saved items"
ON public.saved_items FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can read own saved items"
ON public.saved_items FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete own saved items"
ON public.saved_items FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Drop old session-based policies on user_preferences
DROP POLICY IF EXISTS "Authenticated or session users can insert preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;

-- New auth-only policies for user_preferences
CREATE POLICY "Users can insert own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can read own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON public.user_preferences FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Drop old session-based policies on fit_feedback
DROP POLICY IF EXISTS "Users can insert fit feedback" ON public.fit_feedback;
DROP POLICY IF EXISTS "Users can read own fit feedback" ON public.fit_feedback;

-- New auth-only policies for fit_feedback
CREATE POLICY "Users can insert fit feedback"
ON public.fit_feedback FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can read own fit feedback"
ON public.fit_feedback FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
