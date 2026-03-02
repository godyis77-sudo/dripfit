ALTER TABLE public.brand_size_charts
ADD CONSTRAINT brand_size_charts_slug_category_region_unique
UNIQUE (brand_slug, category, region);