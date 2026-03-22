
-- Enable RLS on guest_sessions (no policies = no client access, which is intentional)
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- Fix function search path
CREATE OR REPLACE FUNCTION cleanup_expired_guest_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.guest_sessions
  WHERE expires_at < now()
  AND migrated_to_user IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
