
-- PROMPT 0: Schema Prep for Try-On First Strategy
-- 1. Create guest_sessions table (No RLS — accessed only via edge functions with service role)
CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_uuid TEXT NOT NULL UNIQUE,
  session_data JSONB DEFAULT '{}'::jsonb,
  tryon_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  migrated_to_user UUID DEFAULT NULL
);

-- Index for fast guest UUID lookups
CREATE INDEX IF NOT EXISTS idx_guest_sessions_uuid ON public.guest_sessions(guest_uuid);

-- Index for cleanup (expired sessions)
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires ON public.guest_sessions(expires_at) WHERE migrated_to_user IS NULL;

-- 2. Add daily tracking to tryon_usage
ALTER TABLE public.tryon_usage ADD COLUMN IF NOT EXISTS daily_key TEXT;

-- Index for daily limit checks
CREATE INDEX IF NOT EXISTS idx_tryon_usage_daily ON public.tryon_usage(user_id, daily_key);

-- 3. Add explicit tryon_ready flag to product_catalog
ALTER TABLE public.product_catalog ADD COLUMN IF NOT EXISTS tryon_ready BOOLEAN DEFAULT false;

-- Backfill: mark products with images as tryon_ready
UPDATE public.product_catalog
SET tryon_ready = true
WHERE image_url IS NOT NULL AND image_url != '' AND is_active = true;

-- 4. Guest session cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_guest_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.guest_sessions
  WHERE expires_at < now()
  AND migrated_to_user IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
