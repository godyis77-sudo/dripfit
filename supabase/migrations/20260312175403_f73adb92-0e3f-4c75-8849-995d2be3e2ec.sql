-- 1) Create a security-definer function for public profile lookups (display_name, avatar_url only)
CREATE OR REPLACE FUNCTION public.get_public_profiles(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = ANY(p_user_ids);
$$;

-- 2) Tighten profiles SELECT: users can only read their OWN full profile
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) Restrict community_votes SELECT to own votes or votes on public posts
DROP POLICY IF EXISTS "Authenticated users can view votes" ON public.community_votes;
CREATE POLICY "Users can view relevant votes"
  ON public.community_votes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR post_id IN (
      SELECT id FROM public.tryon_posts WHERE is_public = true
    )
  );