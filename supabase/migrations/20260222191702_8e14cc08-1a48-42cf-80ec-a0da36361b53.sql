
-- Create wardrobe table for saving clothing uploads as potential buy outfits
CREATE TABLE public.clothing_wardrobe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'top',
  product_link TEXT,
  retailer TEXT,
  brand TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clothing_wardrobe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wardrobe" ON public.clothing_wardrobe FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wardrobe" ON public.clothing_wardrobe FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own wardrobe" ON public.clothing_wardrobe FOR DELETE USING (auth.uid() = user_id);
