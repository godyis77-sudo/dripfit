
-- 1. Add referral columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- 2. Auto-generate referral code on profile insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.referral_code := LOWER(SUBSTRING(MD5(NEW.user_id::text) FROM 1 FOR 8));
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- 3. Backfill existing users
UPDATE profiles
  SET referral_code = LOWER(SUBSTRING(MD5(user_id::text) FROM 1 FOR 8))
  WHERE referral_code IS NULL;
