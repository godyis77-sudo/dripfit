-- Remove duplicate rows keeping only the latest entry per (user_id, image_url)
DELETE FROM public.clothing_wardrobe a
USING public.clothing_wardrobe b
WHERE a.user_id = b.user_id
  AND a.image_url = b.image_url
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE public.clothing_wardrobe ADD CONSTRAINT clothing_wardrobe_user_image_unique UNIQUE (user_id, image_url);