-- 1. Drop vulnerable storage policy. The policy used an unanchored LIKE
-- (tp.result_photo_url ~~ '%/' || objects.name) against a user-controlled
-- URL column, which lets attackers forge a post URL ending in another
-- user's private storage path and read those private bytes. Result images
-- are actually served from the `tryon-composites` bucket via signed URLs,
-- so this policy on `tryon-images` is unnecessary.
DROP POLICY IF EXISTS "Authenticated users can view public post result images" ON storage.objects;

-- 2. Revoke EXECUTE on handle_new_user from anon/public. It is a trigger
-- function on auth.users and never needs to be called via the Data API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;