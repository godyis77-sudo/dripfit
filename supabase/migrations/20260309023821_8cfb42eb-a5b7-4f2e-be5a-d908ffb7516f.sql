
CREATE TABLE public.tryon_usage (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month_key)
);

ALTER TABLE public.tryon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage" ON public.tryon_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON public.tryon_usage FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON public.tryon_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
