
-- Favorite retailers for users
CREATE TABLE public.user_favorite_retailers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  retailer_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, retailer_name)
);

ALTER TABLE public.user_favorite_retailers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorite retailers"
  ON public.user_favorite_retailers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorite retailers"
  ON public.user_favorite_retailers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorite retailers"
  ON public.user_favorite_retailers FOR DELETE
  USING (auth.uid() = user_id);
