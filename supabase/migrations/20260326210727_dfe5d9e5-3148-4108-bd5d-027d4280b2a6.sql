
-- Engagement-weighted trending: scores posts by votes + ratings + recency decay
CREATE OR REPLACE FUNCTION public.get_trending_posts(
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0,
  p_hours_window int DEFAULT 168
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  clothing_photo_url text,
  result_photo_url text,
  caption text,
  is_public boolean,
  created_at timestamptz,
  product_urls text[],
  clothing_category text,
  trending_score numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT
    tp.id,
    tp.user_id,
    tp.clothing_photo_url,
    tp.result_photo_url,
    tp.caption,
    tp.is_public,
    tp.created_at,
    tp.product_urls,
    tp.clothing_category,
    -- Score: votes (2pts each) + ratings (3pts each) + recency decay
    (
      COALESCE(v.vote_count, 0) * 2
      + COALESCE(r.rating_count, 0) * 3
      + COALESCE(c.comment_count, 0) * 1
    )::numeric
    / POWER(
        GREATEST(EXTRACT(EPOCH FROM (now() - tp.created_at)) / 3600.0, 1),
        0.8
      ) AS trending_score
  FROM tryon_posts tp
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS vote_count
    FROM community_votes cv WHERE cv.post_id = tp.id
  ) v ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS rating_count
    FROM tryon_ratings tr WHERE tr.post_id = tp.id
  ) r ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS comment_count
    FROM post_comments pc WHERE pc.post_id = tp.id
  ) c ON true
  WHERE tp.is_public = true
    AND tp.moderation_status = 'approved'
    AND tp.created_at >= now() - make_interval(hours => p_hours_window)
  ORDER BY trending_score DESC, tp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Get products that similar-fit users have engaged with (voted buy_yes or keep_shopping)
CREATE OR REPLACE FUNCTION public.get_fit_recommended_products(
  p_user_id uuid,
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  product_url text,
  clothing_photo_url text,
  engagement_count bigint,
  category text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  WITH user_scan AS (
    SELECT chest_min, chest_max, waist_min, waist_max, hip_min, hip_max,
           inseam_min, inseam_max
    FROM body_scans
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1
  ),
  user_gender AS (
    SELECT COALESCE(gender, 'unknown') AS gender FROM profiles WHERE user_id = p_user_id LIMIT 1
  ),
  similar_users AS (
    SELECT bs.user_id
    FROM body_scans bs, user_scan us, user_gender ug
    WHERE bs.user_id != p_user_id
      AND bs.user_id IS NOT NULL
      AND ABS(((bs.chest_min + bs.chest_max) / 2.0) - ((us.chest_min + us.chest_max) / 2.0)) <= 5
      AND ABS(((bs.waist_min + bs.waist_max) / 2.0) - ((us.waist_min + us.waist_max) / 2.0)) <= 5
      AND ABS(((bs.hip_min + bs.hip_max) / 2.0) - ((us.hip_min + us.hip_max) / 2.0)) <= 5
    LIMIT 100
  ),
  engaged_posts AS (
    SELECT tp.product_urls, tp.clothing_photo_url, tp.clothing_category
    FROM community_votes cv
    JOIN tryon_posts tp ON tp.id = cv.post_id
    WHERE cv.user_id IN (SELECT user_id FROM similar_users)
      AND cv.vote_key IN ('buy_yes', 'keep_shopping')
      AND tp.product_urls IS NOT NULL
      AND array_length(tp.product_urls, 1) > 0
  )
  SELECT
    unnest(ep.product_urls) AS product_url,
    ep.clothing_photo_url,
    count(*) AS engagement_count,
    ep.clothing_category AS category
  FROM engaged_posts ep
  GROUP BY unnest(ep.product_urls), ep.clothing_photo_url, ep.clothing_category
  ORDER BY engagement_count DESC
  LIMIT p_limit;
$$;
