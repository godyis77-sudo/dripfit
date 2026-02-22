
-- Saved items for purchase intent tracking
CREATE TABLE public.saved_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  product_link TEXT,
  product_image_url TEXT,
  retailer TEXT,
  brand TEXT,
  category TEXT,
  size_recommendation TEXT,
  confidence TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved items"
  ON public.saved_items FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can insert saved items"
  ON public.saved_items FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can delete own saved items"
  ON public.saved_items FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- Fit feedback for post-purchase learning
CREATE TABLE public.fit_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  retailer TEXT NOT NULL,
  brand TEXT,
  item_description TEXT,
  size_worn TEXT NOT NULL,
  recommended_size TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('tight', 'perfect', 'loose')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fit_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own fit feedback"
  ON public.fit_feedback FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can insert fit feedback"
  ON public.fit_feedback FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

CREATE INDEX idx_saved_items_user ON public.saved_items(user_id);
CREATE INDEX idx_saved_items_session ON public.saved_items(session_id);
CREATE INDEX idx_fit_feedback_user ON public.fit_feedback(user_id);
CREATE INDEX idx_fit_feedback_session ON public.fit_feedback(session_id);
