ALTER TABLE public.brand_size_charts 
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'unisex',
  ADD COLUMN IF NOT EXISTS size_type text NOT NULL DEFAULT 'regular';

COMMENT ON COLUMN public.brand_size_charts.gender IS 'Target gender: men, women, unisex';
COMMENT ON COLUMN public.brand_size_charts.size_type IS 'Size range: regular, tall, petite, plus';