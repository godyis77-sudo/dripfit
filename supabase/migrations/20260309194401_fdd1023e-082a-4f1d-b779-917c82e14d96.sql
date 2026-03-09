
CREATE OR REPLACE FUNCTION public.increment_referral_credits(target_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE profiles
  SET referral_credits = referral_credits + 1
  WHERE user_id = target_user_id;
$$;
