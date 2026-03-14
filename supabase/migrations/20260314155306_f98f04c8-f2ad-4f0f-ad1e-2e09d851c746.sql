
CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text DEFAULT 'waitlist',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_signups_email_unique UNIQUE (email)
);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (no auth required for waitlist)
CREATE POLICY "Anyone can insert waitlist signups"
  ON public.waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read waitlist signups"
  ON public.waitlist_signups
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
