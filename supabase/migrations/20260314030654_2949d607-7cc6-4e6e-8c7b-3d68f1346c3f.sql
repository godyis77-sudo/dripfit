
-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  code text NOT NULL,
  bonus_tryons integer NOT NULL DEFAULT 10,
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code)
);

-- Payout requests table
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  payout_method text DEFAULT 'paypal',
  payout_email text DEFAULT NULL,
  notes text DEFAULT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz DEFAULT NULL
);

-- RLS on promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can read own promo codes"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert own promo codes"
  ON public.promo_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id AND has_role(auth.uid(), 'creator'));

CREATE POLICY "Creators can update own promo codes"
  ON public.promo_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Anyone can read active promo codes for redemption"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can read all promo codes"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS on payout_requests
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can read own payout requests"
  ON public.payout_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert own payout requests"
  ON public.payout_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id AND has_role(auth.uid(), 'creator'));

CREATE POLICY "Admins can read all payout requests"
  ON public.payout_requests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payout requests"
  ON public.payout_requests FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Index for fast promo code lookups
CREATE INDEX idx_promo_codes_code ON public.promo_codes (LOWER(code));
CREATE INDEX idx_payout_requests_creator ON public.payout_requests (creator_id, status);
