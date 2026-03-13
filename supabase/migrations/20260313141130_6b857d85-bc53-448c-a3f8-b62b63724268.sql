
-- Drop old unique constraint and create new one including gender + size_type
ALTER TABLE public.brand_size_charts DROP CONSTRAINT brand_size_charts_slug_category_region_unique;
ALTER TABLE public.brand_size_charts ADD CONSTRAINT brand_size_charts_slug_cat_region_gender_sizetype_unique 
  UNIQUE (brand_slug, category, region, gender, size_type);
