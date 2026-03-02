
-- Table 1: brand_size_charts
CREATE TABLE public.brand_size_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tops','bottoms','dresses','outerwear','footwear','activewear')),
  region TEXT NOT NULL DEFAULT 'US',
  size_system TEXT NOT NULL DEFAULT 'alpha' CHECK (size_system IN ('alpha','numeric','eu','uk','us','jp')),
  size_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_url TEXT,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  confidence NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
  notes TEXT
);

CREATE UNIQUE INDEX idx_brand_size_charts_active ON public.brand_size_charts (brand_slug, category, region) WHERE is_active = true;
CREATE INDEX idx_brand_size_charts_slug ON public.brand_size_charts (brand_slug);
CREATE INDEX idx_brand_size_charts_search ON public.brand_size_charts USING gin(to_tsvector('english', brand_name));

ALTER TABLE public.brand_size_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active charts"
  ON public.brand_size_charts FOR SELECT TO authenticated
  USING (is_active = true);

-- Table 2: size_recommendations_cache
CREATE TABLE public.size_recommendations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_slug TEXT NOT NULL,
  category TEXT NOT NULL,
  recommended_size TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  fit_notes TEXT,
  fit_status TEXT NOT NULL CHECK (fit_status IN ('true_to_size','good_fit','between_sizes','out_of_range')),
  second_option TEXT,
  measurements_snapshot JSONB NOT NULL,
  chart_id UUID REFERENCES public.brand_size_charts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days'
);

-- Regular index (partial index with now() not allowed since now() is not immutable)
CREATE INDEX idx_size_rec_cache_lookup ON public.size_recommendations_cache (user_id, brand_slug, category);

ALTER TABLE public.size_recommendations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recommendations"
  ON public.size_recommendations_cache FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table 3: brand_requests
CREATE TABLE public.brand_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending'
);

ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert brand requests"
  ON public.brand_requests FOR INSERT TO authenticated
  WITH CHECK (true);
