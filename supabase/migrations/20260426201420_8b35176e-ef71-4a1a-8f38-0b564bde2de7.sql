
CREATE TABLE IF NOT EXISTS public.tryon_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  guest_uuid TEXT NULL,
  user_tier TEXT NOT NULL DEFAULT 'guest',
  status TEXT NOT NULL DEFAULT 'started',
  error_code TEXT NULL,
  error_message TEXT NULL,
  item_type TEXT NULL,
  background_source TEXT NULL,
  latency_ms INTEGER NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tryon_attempts_status_chk CHECK (status IN ('started','succeeded','failed','rejected'))
);

CREATE INDEX IF NOT EXISTS idx_tryon_attempts_user ON public.tryon_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_tryon_attempts_guest ON public.tryon_attempts(guest_uuid);
CREATE INDEX IF NOT EXISTS idx_tryon_attempts_status ON public.tryon_attempts(status);
CREATE INDEX IF NOT EXISTS idx_tryon_attempts_created ON public.tryon_attempts(created_at DESC);

ALTER TABLE public.tryon_attempts ENABLE ROW LEVEL SECURITY;

-- Users see their own attempts
CREATE POLICY "Users can read own attempts"
ON public.tryon_attempts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins see everything
CREATE POLICY "Admins can read all attempts"
ON public.tryon_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No client INSERT/UPDATE/DELETE policies — only the service role (edge function) writes.
