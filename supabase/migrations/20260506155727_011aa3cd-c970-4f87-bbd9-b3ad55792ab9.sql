-- 1) Remove broad public SELECT on promo_codes (creator_id leak).
--    Redemption flows through the claim-referral edge function (service role),
--    so authenticated users do not need direct table read access.
DROP POLICY IF EXISTS "Anyone can read active promo codes for redemption" ON public.promo_codes;

-- 2) Tighten storage policy on tryon-images: only allow read access via
--    result_photo_url of public+approved posts (not user_photo_url or
--    clothing_photo_url, which are private inputs), and use exact-suffix
--    matching to prevent partial-filename spoofing through INSERTed posts.
DROP POLICY IF EXISTS "Authenticated users can view public post images" ON storage.objects;

CREATE POLICY "Authenticated users can view public post result images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tryon-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.tryon_posts tp
    WHERE tp.is_public = true
      AND tp.moderation_status = 'approved'
      AND tp.result_photo_url LIKE '%/' || objects.name
  )
);