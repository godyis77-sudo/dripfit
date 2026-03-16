
-- Add missing measurement columns to size_chart_rows
ALTER TABLE public.size_chart_rows
  ADD COLUMN IF NOT EXISTS sleeve_min numeric,
  ADD COLUMN IF NOT EXISTS sleeve_max numeric,
  ADD COLUMN IF NOT EXISTS height_min numeric,
  ADD COLUMN IF NOT EXISTS height_max numeric;

-- Add preferred_shoe_size to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_shoe_size text;

-- Update the update_own_profile function to accept preferred_shoe_size
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_instagram_handle text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_shopping_region text DEFAULT NULL,
  p_preferred_shoe_size text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET
    display_name = COALESCE(p_display_name, display_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    instagram_handle = COALESCE(p_instagram_handle, instagram_handle),
    gender = COALESCE(p_gender, gender),
    shopping_region = COALESCE(p_shopping_region, shopping_region),
    preferred_shoe_size = COALESCE(p_preferred_shoe_size, preferred_shoe_size),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;
