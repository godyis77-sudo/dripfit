
-- Product catalog for scraped/curated items with metadata
CREATE TABLE public.product_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  retailer TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  product_url TEXT,
  price_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

-- Anyone can read active products
CREATE POLICY "Anyone can read active products"
  ON public.product_catalog FOR SELECT
  USING (is_active = true);

-- Index for category + brand lookups
CREATE INDEX idx_product_catalog_category ON public.product_catalog(category);
CREATE INDEX idx_product_catalog_brand ON public.product_catalog(brand);
CREATE INDEX idx_product_catalog_retailer ON public.product_catalog(retailer);

-- User preferred brands
CREATE TABLE public.user_preferred_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, brand_name)
);

ALTER TABLE public.user_preferred_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferred brands"
  ON public.user_preferred_brands FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add preferred brands"
  ON public.user_preferred_brands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove preferred brands"
  ON public.user_preferred_brands FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for product_catalog updated_at
CREATE TRIGGER update_product_catalog_updated_at
  BEFORE UPDATE ON public.product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
