
-- Add gender to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gender text 
CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say'));

-- Add clothing_category to tryon_posts
ALTER TABLE tryon_posts 
ADD COLUMN IF NOT EXISTS clothing_category text
CHECK (clothing_category IN ('tops', 'bottoms', 'outerwear', 'dress', 'jumpsuit', 'other'));

-- Create SECURITY DEFINER function for similar fit matching
CREATE OR REPLACE FUNCTION get_similar_fit_users(
  p_user_id uuid,
  p_gender text,
  p_chest_mid float,
  p_waist_mid float,
  p_hip_mid float,
  p_inseam_mid float,
  p_bust_mid float DEFAULT NULL,
  p_sleeve_mid float DEFAULT NULL,
  p_tolerance float DEFAULT 5.0
)
RETURNS TABLE(user_id uuid, match_score int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.user_id,
    (
      CASE WHEN ABS(((bs.chest_min + bs.chest_max) / 2.0) - p_chest_mid) 
        <= p_tolerance THEN 2 ELSE 0 END +
      CASE WHEN ABS(((bs.waist_min + bs.waist_max) / 2.0) - p_waist_mid) 
        <= p_tolerance THEN 2 ELSE 0 END +
      CASE WHEN ABS(((bs.hip_min + bs.hip_max) / 2.0) - p_hip_mid) 
        <= p_tolerance THEN 2 ELSE 0 END +
      CASE WHEN ABS(((bs.inseam_min + bs.inseam_max) / 2.0) - p_inseam_mid) 
        <= p_tolerance THEN 2 ELSE 0 END +
      CASE WHEN p_sleeve_mid IS NOT NULL 
        AND bs.sleeve_min IS NOT NULL 
        AND bs.sleeve_max IS NOT NULL
        AND ABS(((bs.sleeve_min + bs.sleeve_max) / 2.0) - p_sleeve_mid) 
        <= p_tolerance THEN 1 ELSE 0 END +
      CASE WHEN p_gender = 'female' 
        AND p_bust_mid IS NOT NULL 
        AND bs.bust_min IS NOT NULL 
        AND bs.bust_max IS NOT NULL
        AND ABS(((bs.bust_min + bs.bust_max) / 2.0) - p_bust_mid) 
        <= p_tolerance THEN 3 ELSE 0 END
    )::int AS match_score
  FROM body_scans bs
  WHERE bs.user_id != p_user_id
    AND bs.user_id IS NOT NULL
    AND bs.chest_min >= p_chest_mid - p_tolerance
    AND bs.chest_max <= p_chest_mid + p_tolerance + 10
  ORDER BY match_score DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION get_similar_fit_users TO authenticated;
