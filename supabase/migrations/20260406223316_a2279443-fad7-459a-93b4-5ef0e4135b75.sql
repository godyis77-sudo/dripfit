
-- Weekly curated outfits
CREATE TABLE public.weekly_outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id text NOT NULL,
  occasion text NOT NULL,
  occasion_label text NOT NULL,
  occasion_emoji text,
  title text NOT NULL,
  description text,
  season text,
  gender text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  trend_signals jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(week_id, occasion, gender)
);

CREATE TABLE public.weekly_outfit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id uuid NOT NULL REFERENCES public.weekly_outfits(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.product_catalog(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  brand text,
  category text,
  price_cents integer,
  currency text DEFAULT 'USD',
  image_url text,
  product_url text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_weekly_outfits_week_id ON public.weekly_outfits(week_id);
CREATE INDEX idx_weekly_outfits_is_active ON public.weekly_outfits(is_active);
CREATE INDEX idx_weekly_outfit_items_outfit_id ON public.weekly_outfit_items(outfit_id);

-- RLS
ALTER TABLE public.weekly_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_outfit_items ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read active weekly outfits"
  ON public.weekly_outfits FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Anyone can read weekly outfit items"
  ON public.weekly_outfit_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin write on weekly_outfits
CREATE POLICY "Admins can insert weekly outfits"
  ON public.weekly_outfits FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update weekly outfits"
  ON public.weekly_outfits FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete weekly outfits"
  ON public.weekly_outfits FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin write on weekly_outfit_items
CREATE POLICY "Admins can insert weekly outfit items"
  ON public.weekly_outfit_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update weekly outfit items"
  ON public.weekly_outfit_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete weekly outfit items"
  ON public.weekly_outfit_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
