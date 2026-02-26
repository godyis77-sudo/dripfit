-- Add product_url column to tryon_posts
ALTER TABLE public.tryon_posts ADD COLUMN product_url text DEFAULT NULL;