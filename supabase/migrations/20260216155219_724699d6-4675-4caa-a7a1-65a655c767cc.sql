
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Try-on posts table
CREATE TABLE public.tryon_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_photo_url TEXT NOT NULL,
  clothing_photo_url TEXT NOT NULL,
  result_photo_url TEXT NOT NULL,
  caption TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tryon_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own posts" ON public.tryon_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public posts" ON public.tryon_posts FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert own posts" ON public.tryon_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.tryon_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.tryon_posts FOR DELETE USING (auth.uid() = user_id);

-- Ratings table
CREATE TABLE public.tryon_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.tryon_posts(id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style_score INT NOT NULL CHECK (style_score BETWEEN 1 AND 5),
  color_score INT NOT NULL CHECK (color_score BETWEEN 1 AND 5),
  buy_score INT NOT NULL CHECK (buy_score BETWEEN 1 AND 5),
  suitability_score INT NOT NULL CHECK (suitability_score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, rater_user_id)
);

ALTER TABLE public.tryon_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view ratings" ON public.tryon_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own ratings" ON public.tryon_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_user_id);
CREATE POLICY "Users can update own ratings" ON public.tryon_ratings FOR UPDATE TO authenticated USING (auth.uid() = rater_user_id);
CREATE POLICY "Users can delete own ratings" ON public.tryon_ratings FOR DELETE TO authenticated USING (auth.uid() = rater_user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('tryon-images', 'tryon-images', true);

CREATE POLICY "Authenticated users can upload tryon images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tryon-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view tryon images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tryon-images');

CREATE POLICY "Users can delete own tryon images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tryon-images' AND auth.uid()::text = (storage.foldername(name))[1]);
