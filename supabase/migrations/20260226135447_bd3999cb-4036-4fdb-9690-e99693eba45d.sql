
-- Create seed_posts table for demo community content
CREATE TABLE public.seed_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL,
  caption text,
  image_url text NOT NULL,
  like_count integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seed_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read seed posts (they're demo content)
CREATE POLICY "Anyone can read seed posts"
  ON public.seed_posts FOR SELECT
  USING (true);

-- Only service role can insert/update/delete (admin only)
-- No INSERT/UPDATE/DELETE policies for anon/authenticated

-- Insert 10 seed posts with Unsplash fashion images
INSERT INTO public.seed_posts (username, caption, image_url, like_count, created_at) VALUES
  ('Alex', 'Date night look?', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=750&fit=crop', 42, now() - interval '2 days'),
  ('Jordan', 'Office casual vibes?', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&h=750&fit=crop', 38, now() - interval '5 days'),
  ('Sam', 'Festival ready?', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=750&fit=crop', 55, now() - interval '8 days'),
  ('Riley', 'Too bold?', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=750&fit=crop', 61, now() - interval '3 days'),
  ('Morgan', 'Brunch fit', 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&h=750&fit=crop', 34, now() - interval '12 days'),
  ('Kai', 'Street style check', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&h=750&fit=crop', 29, now() - interval '1 day'),
  ('Taylor', 'Weekend casual?', 'https://images.unsplash.com/photo-1434389677669-e08b4cda3a25?w=600&h=750&fit=crop', 47, now() - interval '15 days'),
  ('Casey', 'Work from home fit?', 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=600&h=750&fit=crop', 23, now() - interval '20 days'),
  ('Quinn', 'Going out top — keep or return?', 'https://images.unsplash.com/photo-1581044777550-4cfa60707998?w=600&h=750&fit=crop', 72, now() - interval '7 days'),
  ('Jamie', 'Formal Friday or too much?', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=750&fit=crop', 87, now() - interval '25 days');
