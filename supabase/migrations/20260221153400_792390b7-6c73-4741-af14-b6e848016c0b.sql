
-- Size chart tables for retailer matching
CREATE TABLE public.size_charts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer TEXT NOT NULL,
  brand TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('men', 'women', 'unisex')),
  category TEXT NOT NULL,
  units TEXT NOT NULL DEFAULT 'cm',
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.size_chart_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chart_id UUID NOT NULL REFERENCES public.size_charts(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL,
  chest_min NUMERIC,
  chest_max NUMERIC,
  bust_min NUMERIC,
  bust_max NUMERIC,
  waist_min NUMERIC,
  waist_max NUMERIC,
  hip_min NUMERIC,
  hip_max NUMERIC,
  inseam_min NUMERIC,
  inseam_max NUMERIC,
  shoulder_min NUMERIC,
  shoulder_max NUMERIC
);

-- User preferences table
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  fit_preference TEXT NOT NULL DEFAULT 'regular' CHECK (fit_preference IN ('fitted', 'regular', 'relaxed')),
  calibration_brand TEXT,
  calibration_size TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Body scan results stored in DB (replacing localStorage)
CREATE TABLE public.body_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  shoulder_min NUMERIC NOT NULL,
  shoulder_max NUMERIC NOT NULL,
  chest_min NUMERIC NOT NULL,
  chest_max NUMERIC NOT NULL,
  waist_min NUMERIC NOT NULL,
  waist_max NUMERIC NOT NULL,
  hip_min NUMERIC NOT NULL,
  hip_max NUMERIC NOT NULL,
  inseam_min NUMERIC NOT NULL,
  inseam_max NUMERIC NOT NULL,
  height_cm NUMERIC NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  recommended_size TEXT,
  front_photo_used BOOLEAN NOT NULL DEFAULT true,
  side_photo_used BOOLEAN NOT NULL DEFAULT true,
  reference_object TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.size_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_chart_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;

-- Size charts are public read
CREATE POLICY "Anyone can read size charts" ON public.size_charts FOR SELECT USING (true);
CREATE POLICY "Anyone can read size chart rows" ON public.size_chart_rows FOR SELECT USING (true);

-- User preferences: anyone can read/write their own (by user_id or session_id)
CREATE POLICY "Users can read own preferences" ON public.user_preferences FOR SELECT USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);
CREATE POLICY "Anyone can insert preferences" ON public.user_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);
CREATE POLICY "Users can delete own preferences" ON public.user_preferences FOR DELETE USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- Body scans: similar pattern
CREATE POLICY "Users can read own scans" ON public.body_scans FOR SELECT USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);
CREATE POLICY "Anyone can insert scans" ON public.body_scans FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own scans" ON public.body_scans FOR DELETE USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- Create indexes
CREATE INDEX idx_size_charts_retailer ON public.size_charts(retailer);
CREATE INDEX idx_size_charts_category ON public.size_charts(category);
CREATE INDEX idx_size_chart_rows_chart_id ON public.size_chart_rows(chart_id);
CREATE INDEX idx_body_scans_user_id ON public.body_scans(user_id);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Trigger for updated_at on user_preferences
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
