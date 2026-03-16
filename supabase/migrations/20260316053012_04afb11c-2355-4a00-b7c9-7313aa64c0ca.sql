
-- Add fit_preference column to cache table
ALTER TABLE public.size_recommendations_cache 
ADD COLUMN IF NOT EXISTS fit_preference text NOT NULL DEFAULT 'regular';

-- Drop the old unique constraint and create a new one including fit_preference
ALTER TABLE public.size_recommendations_cache 
DROP CONSTRAINT IF EXISTS size_recommendations_cache_user_id_brand_slug_category_key;

ALTER TABLE public.size_recommendations_cache 
ADD CONSTRAINT size_recommendations_cache_user_brand_cat_fit_key 
UNIQUE (user_id, brand_slug, category, fit_preference);
