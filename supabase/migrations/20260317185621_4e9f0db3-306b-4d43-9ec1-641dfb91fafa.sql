
-- Index for tryon_posts: queried by is_public + created_at (community feed) and user_id (own posts)
CREATE INDEX IF NOT EXISTS idx_tryon_posts_user_id ON public.tryon_posts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_tryon_posts_public_created ON public.tryon_posts USING btree (created_at DESC) WHERE is_public = true AND moderation_status = 'approved';

-- Index for clothing_wardrobe: queried by user_id
CREATE INDEX IF NOT EXISTS idx_clothing_wardrobe_user_id ON public.clothing_wardrobe USING btree (user_id);

-- Index for seed_posts: queried by is_public
CREATE INDEX IF NOT EXISTS idx_seed_posts_public ON public.seed_posts USING btree (created_at DESC) WHERE is_public = true;

-- Index for community_votes: queried by post_id (already exists) but also need user_id lookups
-- idx_community_votes_user_id and idx_community_votes_post_id already exist, good

-- Index for product_catalog: optimize the common browse query pattern
CREATE INDEX IF NOT EXISTS idx_product_catalog_active_category ON public.product_catalog USING btree (category, image_confidence DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_catalog_active_gender ON public.product_catalog USING btree (gender) WHERE is_active = true;
