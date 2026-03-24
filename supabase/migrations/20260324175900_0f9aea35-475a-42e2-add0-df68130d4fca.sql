ALTER TABLE public.clothing_wardrobe ADD COLUMN IF NOT EXISTS is_liked boolean NOT NULL DEFAULT false;
ALTER TABLE public.clothing_wardrobe ADD COLUMN IF NOT EXISTS is_saved boolean NOT NULL DEFAULT false;
ALTER TABLE public.clothing_wardrobe ADD COLUMN IF NOT EXISTS source_post_id uuid;