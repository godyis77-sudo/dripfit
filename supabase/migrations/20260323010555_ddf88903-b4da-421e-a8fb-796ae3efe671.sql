
CREATE TABLE public.outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Outfit',
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.outfit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  wardrobe_item_id UUID NOT NULL REFERENCES public.clothing_wardrobe(id) ON DELETE CASCADE,
  slot TEXT NOT NULL DEFAULT 'top',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(outfit_id, wardrobe_item_id)
);

ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own outfits" ON public.outfits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own outfits" ON public.outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outfits" ON public.outfits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own outfits" ON public.outfits FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own outfit items" ON public.outfit_items FOR SELECT USING (
  outfit_id IN (SELECT id FROM public.outfits WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own outfit items" ON public.outfit_items FOR INSERT WITH CHECK (
  outfit_id IN (SELECT id FROM public.outfits WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own outfit items" ON public.outfit_items FOR DELETE USING (
  outfit_id IN (SELECT id FROM public.outfits WHERE user_id = auth.uid())
);

CREATE INDEX idx_outfits_user_id ON public.outfits(user_id);
CREATE INDEX idx_outfit_items_outfit_id ON public.outfit_items(outfit_id);
