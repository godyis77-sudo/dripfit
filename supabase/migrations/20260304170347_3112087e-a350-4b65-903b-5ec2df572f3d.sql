
-- 1. Add missing UPDATE policy on body_scans
CREATE POLICY "Users can update own scans"
ON public.body_scans
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Add missing UPDATE policy on saved_items
CREATE POLICY "Users can update own saved items"
ON public.saved_items
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Add missing UPDATE and DELETE policies on fit_feedback
CREATE POLICY "Users can update own fit feedback"
ON public.fit_feedback
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete own fit feedback"
ON public.fit_feedback
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 4. Add missing SELECT, UPDATE, DELETE policies on brand_requests
CREATE POLICY "Users can view own brand requests"
ON public.brand_requests
FOR SELECT
TO authenticated
USING (auth.uid() = requested_by);

CREATE POLICY "Users can update own brand requests"
ON public.brand_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = requested_by);

CREATE POLICY "Users can delete own brand requests"
ON public.brand_requests
FOR DELETE
TO authenticated
USING (auth.uid() = requested_by);

-- 5. Create post_comments table
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.tryon_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  comment_text text NOT NULL CHECK (char_length(comment_text) <= 500),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
ON public.post_comments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own comments"
ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.post_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX post_comments_post_id_idx ON public.post_comments(post_id);
CREATE INDEX post_comments_user_id_idx ON public.post_comments(user_id);

-- 6. Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  user_id uuid PRIMARY KEY,
  is_active boolean DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan_type text CHECK (plan_type IN ('monthly', 'annual')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
