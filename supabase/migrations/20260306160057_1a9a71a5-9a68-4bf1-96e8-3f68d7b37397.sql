-- Fix community_votes.post_id from TEXT to UUID with foreign key
ALTER TABLE public.community_votes
  ALTER COLUMN post_id TYPE UUID USING post_id::UUID;

ALTER TABLE public.community_votes
  ADD CONSTRAINT fk_community_votes_post
  FOREIGN KEY (post_id) REFERENCES public.tryon_posts(id) ON DELETE CASCADE;

-- Drop legacy product_url column now superseded by product_urls[]
ALTER TABLE public.tryon_posts DROP COLUMN IF EXISTS product_url;