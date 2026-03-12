-- 1) Restrict profiles UPDATE to safe columns only via a security definer function
-- Remove the broad UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a safe update function
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_instagram_handle text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_shopping_region text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    display_name = COALESCE(p_display_name, display_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    instagram_handle = COALESCE(p_instagram_handle, instagram_handle),
    gender = COALESCE(p_gender, gender),
    shopping_region = COALESCE(p_shopping_region, shopping_region),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- 2) Remove tryon_usage UPDATE policy (counter should only be incremented server-side)
DROP POLICY IF EXISTS "Users can update own usage" ON public.tryon_usage;

-- Create increment-only function
CREATE OR REPLACE FUNCTION public.increment_tryon_usage(p_month_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tryon_usage (user_id, month_key, count)
  VALUES (auth.uid(), p_month_key, 1)
  ON CONFLICT (user_id, month_key)
  DO UPDATE SET count = tryon_usage.count + 1;
END;
$$;

-- 3) Restrict tryon_posts UPDATE to safe columns only
DROP POLICY IF EXISTS "Users can update own posts" ON public.tryon_posts;
CREATE POLICY "Users can update own posts safely"
  ON public.tryon_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND moderation_status = (SELECT moderation_status FROM public.tryon_posts WHERE id = tryon_posts.id)
  );

-- 4) Remove brand_requests UPDATE policy (status changes should be admin-only)
DROP POLICY IF EXISTS "Users can update own brand requests" ON public.brand_requests;