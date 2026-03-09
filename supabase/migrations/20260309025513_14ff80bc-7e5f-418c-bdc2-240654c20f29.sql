CREATE TABLE public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referee_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  bonus_granted BOOLEAN DEFAULT false
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referrers can see referrals they sent
CREATE POLICY "Users can read own referrals as referrer"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id);

-- Referees can see their own referral
CREATE POLICY "Users can read own referrals as referee"
ON public.referrals FOR SELECT
USING (auth.uid() = referee_id);

-- Authenticated users can insert referrals (referee inserts on signup)
CREATE POLICY "Authenticated users can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referee_id);