
-- 1. Fix mutable search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;

-- 2. Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions that should be service-role only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_guest_sessions() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_referral_credits(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_similar_fit_users(uuid, text, double precision, double precision, double precision, double precision, double precision, double precision, double precision) FROM anon, public;

-- 3. Lock down public storage bucket listing.
-- Public buckets still serve files via the /object/public CDN endpoint (RLS bypassed),
-- so dropping the broad SELECT policy prevents object enumeration without breaking reads.
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read curated backgrounds" ON storage.objects;

-- 4. Stop broadcasting tryon_posts row changes via Realtime (private rows could leak to any subscriber).
-- The community feed will rely on TanStack Query refetches instead of live updates.
ALTER PUBLICATION supabase_realtime DROP TABLE public.tryon_posts;
