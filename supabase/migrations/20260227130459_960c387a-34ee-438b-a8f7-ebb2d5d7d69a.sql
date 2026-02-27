
-- 1. Make tryon-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'tryon-images';

-- 2. Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view tryon images" ON storage.objects;

-- 3. Users can view their own tryon images
CREATE POLICY "Users can view own tryon images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tryon-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Authenticated users can view images from public posts
CREATE POLICY "Authenticated users can view public post images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tryon-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.tryon_posts
      WHERE is_public = true
      AND (result_photo_url LIKE '%' || storage.objects.name || '%'
           OR user_photo_url LIKE '%' || storage.objects.name || '%'
           OR clothing_photo_url LIKE '%' || storage.objects.name || '%')
    )
  );

-- 5. Add null validation to handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
