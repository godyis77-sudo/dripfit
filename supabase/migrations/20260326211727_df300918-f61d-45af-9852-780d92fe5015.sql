
-- Affiliate clickout attribution tracking
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  retailer text NOT NULL,
  destination_url text NOT NULL,
  monetization_mode text NOT NULL DEFAULT 'aggregator',
  affiliate_provider text,
  retailer_used text,
  source text DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_clicks_user ON public.affiliate_clicks(user_id);
CREATE INDEX idx_affiliate_clicks_created ON public.affiliate_clicks(created_at DESC);
CREATE INDEX idx_affiliate_clicks_retailer ON public.affiliate_clicks(retailer);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own clicks
CREATE POLICY "Users can insert own clicks"
ON public.affiliate_clicks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can read own clicks
CREATE POLICY "Users can read own clicks"
ON public.affiliate_clicks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all clicks
CREATE POLICY "Admins can read all clicks"
ON public.affiliate_clicks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow anon inserts for guest clickouts (session_id only)
CREATE POLICY "Anon can insert guest clicks"
ON public.affiliate_clicks FOR INSERT
TO anon
WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);
