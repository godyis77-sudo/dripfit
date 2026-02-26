
CREATE TABLE public.retailers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read retailers"
ON public.retailers
FOR SELECT
USING (true);
