
-- Add 'founder' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'founder';

-- Create access_codes table
CREATE TABLE public.access_codes (
  code TEXT PRIMARY KEY,
  is_used BOOLEAN NOT NULL DEFAULT false,
  allocated_to TEXT,
  used_by_email TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read codes (needed to verify on signup)
CREATE POLICY "Anyone can read access codes"
  ON public.access_codes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create a security definer function to claim a code atomically
CREATE OR REPLACE FUNCTION public.claim_founder_code(p_code TEXT, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_found BOOLEAN;
BEGIN
  -- Attempt atomic claim
  UPDATE public.access_codes
  SET is_used = true,
      used_by_email = p_email,
      claimed_at = now()
  WHERE code = p_code
    AND is_used = false;

  GET DIAGNOSTICS v_found = ROW_COUNT;

  IF v_found > 0 THEN
    -- Grant founder role to the current user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'founder')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
