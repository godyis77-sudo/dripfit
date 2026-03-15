-- Fix the broken tryon_posts UPDATE policy
-- The self-referential subquery (tryon_posts_1.id = tryon_posts_1.id) is always true
-- and causes "more than one row returned" errors when table has 2+ rows.
-- Fix: correlate the subquery to the row being updated.

DROP POLICY IF EXISTS "Users can update own posts safely" ON public.tryon_posts;

CREATE POLICY "Users can update own posts safely"
ON public.tryon_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (
    moderation_status = (
      SELECT tp.moderation_status
      FROM public.tryon_posts tp
      WHERE tp.id = tryon_posts.id
    )
  )
);