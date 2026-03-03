-- Add product_urls array column for multi-item tracking
ALTER TABLE public.tryon_posts ADD COLUMN product_urls text[] DEFAULT '{}';

-- Backfill existing posts: copy product_url into the array
UPDATE public.tryon_posts SET product_urls = ARRAY[product_url] WHERE product_url IS NOT NULL AND product_url != '';