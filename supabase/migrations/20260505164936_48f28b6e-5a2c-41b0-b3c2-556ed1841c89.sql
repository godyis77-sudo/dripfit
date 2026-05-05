
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_by_name(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_founder_code(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_tryon_usage(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_own_profile(text, text, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_own_profile(text, text, text, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_creator_month_count(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_tryon_funnel_metrics(integer) FROM anon, public;
