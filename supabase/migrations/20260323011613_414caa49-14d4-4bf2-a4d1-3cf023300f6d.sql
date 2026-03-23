
CREATE TABLE public.price_watches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.product_catalog(id) ON DELETE CASCADE,
  product_url TEXT,
  product_name TEXT,
  brand TEXT,
  original_price_cents INTEGER NOT NULL,
  current_price_cents INTEGER NOT NULL,
  lowest_price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE public.price_drop_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  watch_id UUID NOT NULL REFERENCES public.price_watches(id) ON DELETE CASCADE,
  old_price_cents INTEGER NOT NULL,
  new_price_cents INTEGER NOT NULL,
  drop_percent NUMERIC NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.price_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_drop_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own watches" ON public.price_watches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watches" ON public.price_watches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watches" ON public.price_watches FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own watches" ON public.price_watches FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own notifications" ON public.price_drop_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.price_drop_notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.price_drop_notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_price_watches_user ON public.price_watches(user_id);
CREATE INDEX idx_price_watches_product ON public.price_watches(product_id);
CREATE INDEX idx_price_drops_user_unread ON public.price_drop_notifications(user_id) WHERE is_read = false;
