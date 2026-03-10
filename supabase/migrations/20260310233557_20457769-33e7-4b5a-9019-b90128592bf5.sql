
-- Add moderation_status column to tryon_posts with default 'approved' to preserve existing posts
ALTER TABLE public.tryon_posts ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved';

-- Update the existing public posts SELECT policy to also require approved status
DROP POLICY IF EXISTS "Authenticated users can view public posts" ON public.tryon_posts;
CREATE POLICY "Authenticated users can view public posts"
  ON public.tryon_posts
  FOR SELECT
  TO authenticated
  USING (is_public = true AND moderation_status = 'approved');
