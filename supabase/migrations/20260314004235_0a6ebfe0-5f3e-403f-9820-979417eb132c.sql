
-- 1. Add 'creator' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creator';

-- 2. Create creator_commissions ledger table (append-only)
CREATE TABLE public.creator_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  referee_id uuid NOT NULL,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 50,
  currency text NOT NULL DEFAULT 'GBP',
  tier_label text NOT NULL DEFAULT 'base',
  status text NOT NULL DEFAULT 'pending',
  month_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  paid_at timestamptz,
  notes text
);

-- Indexes for common queries
CREATE INDEX idx_creator_commissions_creator ON public.creator_commissions(creator_id);
CREATE INDEX idx_creator_commissions_month ON public.creator_commissions(creator_id, month_key);
CREATE INDEX idx_creator_commissions_status ON public.creator_commissions(status);
CREATE UNIQUE INDEX idx_creator_commissions_dedup ON public.creator_commissions(creator_id, referee_id);

-- 3. Enable RLS
ALTER TABLE public.creator_commissions ENABLE ROW LEVEL SECURITY;

-- Creators can read their own commissions
CREATE POLICY "Creators can read own commissions"
ON public.creator_commissions
FOR SELECT
TO authenticated
USING (auth.uid() = creator_id);

-- Admins can read all commissions
CREATE POLICY "Admins can read all commissions"
ON public.creator_commissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update commission status
CREATE POLICY "Admins can update commissions"
ON public.creator_commissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Helper function to get creator monthly install count (for tier calculation)
CREATE OR REPLACE FUNCTION public.get_creator_month_count(p_creator_id uuid, p_month_key text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::int, 0)
  FROM public.creator_commissions
  WHERE creator_id = p_creator_id
    AND month_key = p_month_key;
$$;
