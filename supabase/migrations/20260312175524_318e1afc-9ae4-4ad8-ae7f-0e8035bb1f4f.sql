-- Public profile lookup by display_name for the public profile page
CREATE OR REPLACE FUNCTION public.get_public_profile_by_name(p_display_name text)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, instagram_handle text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url, p.instagram_handle
  FROM public.profiles p
  WHERE LOWER(p.display_name) = LOWER(p_display_name)
  LIMIT 1;
$$;