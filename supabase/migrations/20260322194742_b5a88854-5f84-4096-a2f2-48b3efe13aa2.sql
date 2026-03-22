
-- Create storage buckets for background swap
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('backgrounds-curated', 'backgrounds-curated', true),
  ('backgrounds-user', 'backgrounds-user', false),
  ('backgrounds-cache', 'backgrounds-cache', true),
  ('tryon-composites', 'tryon-composites', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for backgrounds-curated (public read)
CREATE POLICY "Public read curated backgrounds" ON storage.objects
  FOR SELECT USING (bucket_id = 'backgrounds-curated');

-- Storage RLS for backgrounds-user (owner access)
CREATE POLICY "Owner upload user backgrounds" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'backgrounds-user' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner read user backgrounds" ON storage.objects
  FOR SELECT USING (bucket_id = 'backgrounds-user' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner delete user backgrounds" ON storage.objects
  FOR DELETE USING (bucket_id = 'backgrounds-user' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS for tryon-composites (owner access)
CREATE POLICY "Owner upload composites" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tryon-composites' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner read composites" ON storage.objects
  FOR SELECT USING (bucket_id = 'tryon-composites' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner delete composites" ON storage.objects
  FOR DELETE USING (bucket_id = 'tryon-composites' AND (storage.foldername(name))[1] = auth.uid()::text);
